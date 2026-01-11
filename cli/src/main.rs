use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::env;
use std::fs;
use std::io::{BufRead, BufReader, Write};
use std::os::unix::net::UnixStream;
use std::path::PathBuf;
use std::process::{exit, Command, Stdio};
use std::thread;
use std::time::Duration;

#[derive(Serialize)]
struct Request {
    id: String,
    action: String,
    #[serde(flatten)]
    extra: Value,
}

#[derive(Deserialize, Serialize, Default)]
struct Response {
    success: bool,
    data: Option<Value>,
    error: Option<String>,
}

fn get_socket_path(session: &str) -> PathBuf {
    let tmp = env::temp_dir();
    tmp.join(format!("agent-browser-{}.sock", session))
}

fn get_pid_path(session: &str) -> PathBuf {
    let tmp = env::temp_dir();
    tmp.join(format!("agent-browser-{}.pid", session))
}

fn is_daemon_running(session: &str) -> bool {
    let pid_path = get_pid_path(session);
    if !pid_path.exists() {
        return false;
    }
    if let Ok(pid_str) = fs::read_to_string(&pid_path) {
        if let Ok(pid) = pid_str.trim().parse::<i32>() {
            unsafe {
                return libc::kill(pid, 0) == 0;
            }
        }
    }
    false
}

fn ensure_daemon(session: &str, headed: bool) -> Result<(), String> {
    let socket_path = get_socket_path(session);
    
    if is_daemon_running(session) && socket_path.exists() {
        return Ok(());
    }
    
    let exe_path = env::current_exe().map_err(|e| e.to_string())?;
    let exe_dir = exe_path.parent().unwrap();
    
    let daemon_paths = [
        exe_dir.join("daemon.js"),
        exe_dir.join("../dist/daemon.js"),
        PathBuf::from("dist/daemon.js"),
    ];
    
    let daemon_path = daemon_paths
        .iter()
        .find(|p| p.exists())
        .ok_or("Daemon not found. Run from project directory or ensure daemon.js is alongside binary.")?;
    
    let mut cmd = Command::new("node");
    cmd.arg(daemon_path)
        .env("AGENT_BROWSER_DAEMON", "1")
        .env("AGENT_BROWSER_SESSION", session);
    
    if headed {
        cmd.env("AGENT_BROWSER_HEADED", "1");
    }
    
    cmd.stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to start daemon: {}", e))?;
    
    for _ in 0..50 {
        if socket_path.exists() {
            return Ok(());
        }
        thread::sleep(Duration::from_millis(100));
    }
    
    Err("Daemon failed to start".to_string())
}

fn send_command(cmd: Value, session: &str) -> Result<Response, String> {
    let socket_path = get_socket_path(session);
    let mut stream = UnixStream::connect(&socket_path)
        .map_err(|e| format!("Failed to connect: {}", e))?;
    
    stream.set_read_timeout(Some(Duration::from_secs(30))).ok();
    stream.set_write_timeout(Some(Duration::from_secs(5))).ok();
    
    let mut json_str = serde_json::to_string(&cmd).map_err(|e| e.to_string())?;
    json_str.push('\n');
    
    stream.write_all(json_str.as_bytes())
        .map_err(|e| format!("Failed to send: {}", e))?;
    
    let mut reader = BufReader::new(stream);
    let mut response_line = String::new();
    reader.read_line(&mut response_line)
        .map_err(|e| format!("Failed to read: {}", e))?;
    
    serde_json::from_str(&response_line)
        .map_err(|e| format!("Invalid response: {}", e))
}

fn gen_id() -> String {
    format!("r{}", std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_micros() % 1000000)
}

struct Flags {
    json: bool,
    full: bool,
    headed: bool,
    debug: bool,
    session: String,
}

fn parse_flags(args: &[String]) -> Flags {
    let mut flags = Flags {
        json: false,
        full: false,
        headed: false,
        debug: false,
        session: env::var("AGENT_BROWSER_SESSION").unwrap_or_else(|_| "default".to_string()),
    };
    
    let mut i = 0;
    while i < args.len() {
        match args[i].as_str() {
            "--json" => flags.json = true,
            "--full" | "-f" => flags.full = true,
            "--headed" => flags.headed = true,
            "--debug" => flags.debug = true,
            "--session" => {
                if let Some(s) = args.get(i + 1) {
                    flags.session = s.clone();
                    i += 1;
                }
            }
            _ => {}
        }
        i += 1;
    }
    flags
}

fn clean_args(args: &[String]) -> Vec<String> {
    let mut result = Vec::new();
    let mut skip_next = false;
    
    for (i, arg) in args.iter().enumerate() {
        if skip_next {
            skip_next = false;
            continue;
        }
        if arg == "--session" {
            skip_next = true;
            continue;
        }
        if !arg.starts_with("--") && arg != "-f" {
            result.push(arg.clone());
        }
    }
    result
}

fn parse_command(args: &[String], flags: &Flags) -> Option<Value> {
    if args.is_empty() {
        return None;
    }
    
    let cmd = args[0].as_str();
    let rest: Vec<&str> = args[1..].iter().map(|s| s.as_str()).collect();
    let id = gen_id();
    
    match cmd {
        // === Navigation ===
        "open" | "goto" | "navigate" => {
            let url = rest.get(0)?;
            let url = if url.starts_with("http") { url.to_string() } else { format!("https://{}", url) };
            Some(json!({ "id": id, "action": "navigate", "url": url }))
        }
        "back" => Some(json!({ "id": id, "action": "back" })),
        "forward" => Some(json!({ "id": id, "action": "forward" })),
        "reload" => Some(json!({ "id": id, "action": "reload" })),
        
        // === Core Actions ===
        "click" => Some(json!({ "id": id, "action": "click", "selector": rest.get(0)? })),
        "dblclick" => Some(json!({ "id": id, "action": "dblclick", "selector": rest.get(0)? })),
        "fill" => Some(json!({ "id": id, "action": "fill", "selector": rest.get(0)?, "value": rest[1..].join(" ") })),
        "type" => Some(json!({ "id": id, "action": "type", "selector": rest.get(0)?, "text": rest[1..].join(" ") })),
        "hover" => Some(json!({ "id": id, "action": "hover", "selector": rest.get(0)? })),
        "focus" => Some(json!({ "id": id, "action": "focus", "selector": rest.get(0)? })),
        "check" => Some(json!({ "id": id, "action": "check", "selector": rest.get(0)? })),
        "uncheck" => Some(json!({ "id": id, "action": "uncheck", "selector": rest.get(0)? })),
        "select" => Some(json!({ "id": id, "action": "select", "selector": rest.get(0)?, "value": rest.get(1)? })),
        "drag" => Some(json!({ "id": id, "action": "drag", "source": rest.get(0)?, "target": rest.get(1)? })),
        "upload" => Some(json!({ "id": id, "action": "upload", "selector": rest.get(0)?, "files": &rest[1..] })),
        
        // === Keyboard ===
        "press" | "key" => Some(json!({ "id": id, "action": "press", "key": rest.get(0)? })),
        "keydown" => Some(json!({ "id": id, "action": "keydown", "key": rest.get(0)? })),
        "keyup" => Some(json!({ "id": id, "action": "keyup", "key": rest.get(0)? })),
        
        // === Scroll ===
        "scroll" => {
            let dir = rest.get(0).unwrap_or(&"down");
            let amount = rest.get(1).and_then(|s| s.parse::<i32>().ok()).unwrap_or(300);
            Some(json!({ "id": id, "action": "scroll", "direction": dir, "amount": amount }))
        }
        "scrollintoview" | "scrollinto" => Some(json!({ "id": id, "action": "scrollintoview", "selector": rest.get(0)? })),
        
        // === Wait ===
        "wait" => {
            if let Some(arg) = rest.get(0) {
                if arg.parse::<u64>().is_ok() {
                    Some(json!({ "id": id, "action": "wait", "timeout": arg.parse::<u64>().unwrap() }))
                } else {
                    Some(json!({ "id": id, "action": "wait", "selector": arg }))
                }
            } else {
                None
            }
        }
        
        // === Screenshot/PDF ===
        "screenshot" => Some(json!({ "id": id, "action": "screenshot", "path": rest.get(0), "fullPage": flags.full })),
        "pdf" => Some(json!({ "id": id, "action": "pdf", "path": rest.get(0)? })),
        
        // === Snapshot ===
        "snapshot" => {
            let mut cmd = json!({ "id": id, "action": "snapshot" });
            let obj = cmd.as_object_mut().unwrap();
            let mut i = 0;
            while i < rest.len() {
                match rest[i] {
                    "-i" | "--interactive" => { obj.insert("interactive".to_string(), json!(true)); }
                    "-c" | "--compact" => { obj.insert("compact".to_string(), json!(true)); }
                    "-d" | "--depth" => {
                        if let Some(d) = rest.get(i + 1) {
                            if let Ok(n) = d.parse::<i32>() {
                                obj.insert("maxDepth".to_string(), json!(n));
                                i += 1;
                            }
                        }
                    }
                    "-s" | "--selector" => {
                        if let Some(s) = rest.get(i + 1) {
                            obj.insert("selector".to_string(), json!(s));
                            i += 1;
                        }
                    }
                    _ => {}
                }
                i += 1;
            }
            Some(cmd)
        }
        
        // === Eval ===
        "eval" => Some(json!({ "id": id, "action": "evaluate", "script": rest.join(" ") })),
        
        // === Close ===
        "close" | "quit" | "exit" => Some(json!({ "id": id, "action": "close" })),
        
        // === Get ===
        "get" => match rest.get(0).map(|s| *s) {
            Some("text") => Some(json!({ "id": id, "action": "gettext", "selector": rest.get(1)? })),
            Some("html") => Some(json!({ "id": id, "action": "innerhtml", "selector": rest.get(1)? })),
            Some("value") => Some(json!({ "id": id, "action": "inputvalue", "selector": rest.get(1)? })),
            Some("attr") => Some(json!({ "id": id, "action": "getattribute", "selector": rest.get(1)?, "attribute": rest.get(2)? })),
            Some("url") => Some(json!({ "id": id, "action": "url" })),
            Some("title") => Some(json!({ "id": id, "action": "title" })),
            Some("count") => Some(json!({ "id": id, "action": "count", "selector": rest.get(1)? })),
            Some("box") => Some(json!({ "id": id, "action": "boundingbox", "selector": rest.get(1)? })),
            _ => None,
        },
        
        // === Is (state checks) ===
        "is" => match rest.get(0).map(|s| *s) {
            Some("visible") => Some(json!({ "id": id, "action": "isvisible", "selector": rest.get(1)? })),
            Some("enabled") => Some(json!({ "id": id, "action": "isenabled", "selector": rest.get(1)? })),
            Some("checked") => Some(json!({ "id": id, "action": "ischecked", "selector": rest.get(1)? })),
            _ => None,
        },
        
        // === Find (locators) ===
        "find" => {
            let locator = rest.get(0)?;
            let value = rest.get(1)?;
            let subaction = rest.get(2).unwrap_or(&"click");
            let fill_value = if rest.len() > 3 { Some(rest[3..].join(" ")) } else { None };
            
            // Check for --name flag
            let name_idx = rest.iter().position(|&s| s == "--name");
            let name = name_idx.and_then(|i| rest.get(i + 1).map(|s| *s));
            let exact = rest.iter().any(|&s| s == "--exact");
            
            match *locator {
                "role" => Some(json!({ "id": id, "action": "getbyrole", "role": value, "subaction": subaction, "value": fill_value, "name": name, "exact": exact })),
                "text" => Some(json!({ "id": id, "action": "getbytext", "text": value, "subaction": subaction, "exact": exact })),
                "label" => Some(json!({ "id": id, "action": "getbylabel", "label": value, "subaction": subaction, "value": fill_value, "exact": exact })),
                "placeholder" => Some(json!({ "id": id, "action": "getbyplaceholder", "placeholder": value, "subaction": subaction, "value": fill_value, "exact": exact })),
                "alt" => Some(json!({ "id": id, "action": "getbyalttext", "text": value, "subaction": subaction, "exact": exact })),
                "title" => Some(json!({ "id": id, "action": "getbytitle", "text": value, "subaction": subaction, "exact": exact })),
                "testid" => Some(json!({ "id": id, "action": "getbytestid", "testId": value, "subaction": subaction, "value": fill_value })),
                "first" => Some(json!({ "id": id, "action": "nth", "selector": value, "index": 0, "subaction": subaction, "value": fill_value })),
                "last" => Some(json!({ "id": id, "action": "nth", "selector": value, "index": -1, "subaction": subaction, "value": fill_value })),
                "nth" => {
                    let idx = value.parse::<i32>().ok()?;
                    let sel = rest.get(2)?;
                    let sub = rest.get(3).unwrap_or(&"click");
                    let fv = if rest.len() > 4 { Some(rest[4..].join(" ")) } else { None };
                    Some(json!({ "id": id, "action": "nth", "selector": sel, "index": idx, "subaction": sub, "value": fv }))
                }
                _ => None,
            }
        }
        
        // === Mouse ===
        "mouse" => match rest.get(0).map(|s| *s) {
            Some("move") => {
                let x = rest.get(1)?.parse::<i32>().ok()?;
                let y = rest.get(2)?.parse::<i32>().ok()?;
                Some(json!({ "id": id, "action": "mousemove", "x": x, "y": y }))
            }
            Some("down") => Some(json!({ "id": id, "action": "mousedown", "button": rest.get(1).unwrap_or(&"left") })),
            Some("up") => Some(json!({ "id": id, "action": "mouseup", "button": rest.get(1).unwrap_or(&"left") })),
            Some("wheel") => {
                let dy = rest.get(1).and_then(|s| s.parse::<i32>().ok()).unwrap_or(100);
                let dx = rest.get(2).and_then(|s| s.parse::<i32>().ok()).unwrap_or(0);
                Some(json!({ "id": id, "action": "mousewheel", "deltaX": dx, "deltaY": dy }))
            }
            _ => None,
        },
        
        // === Set (browser settings) ===
        "set" => match rest.get(0).map(|s| *s) {
            Some("viewport") => {
                let w = rest.get(1)?.parse::<i32>().ok()?;
                let h = rest.get(2)?.parse::<i32>().ok()?;
                Some(json!({ "id": id, "action": "viewport", "width": w, "height": h }))
            }
            Some("device") => Some(json!({ "id": id, "action": "device", "device": rest.get(1)? })),
            Some("geo") | Some("geolocation") => {
                let lat = rest.get(1)?.parse::<f64>().ok()?;
                let lng = rest.get(2)?.parse::<f64>().ok()?;
                Some(json!({ "id": id, "action": "geolocation", "latitude": lat, "longitude": lng }))
            }
            Some("offline") => {
                let off = rest.get(1).map(|s| *s != "off" && *s != "false").unwrap_or(true);
                Some(json!({ "id": id, "action": "offline", "offline": off }))
            }
            Some("headers") => {
                let headers_json = rest.get(1)?;
                Some(json!({ "id": id, "action": "headers", "headers": headers_json }))
            }
            Some("credentials") | Some("auth") => {
                Some(json!({ "id": id, "action": "credentials", "username": rest.get(1)?, "password": rest.get(2)? }))
            }
            Some("media") => {
                let color = if rest.iter().any(|&s| s == "dark") { "dark" } else if rest.iter().any(|&s| s == "light") { "light" } else { "no-preference" };
                let reduced = rest.iter().any(|&s| s == "reduced-motion");
                Some(json!({ "id": id, "action": "media", "colorScheme": color, "reducedMotion": reduced }))
            }
            _ => None,
        },
        
        // === Network ===
        "network" => match rest.get(0).map(|s| *s) {
            Some("route") => {
                let url = rest.get(1)?;
                let abort = rest.iter().any(|&s| s == "--abort");
                let body_idx = rest.iter().position(|&s| s == "--body");
                let body = body_idx.and_then(|i| rest.get(i + 1).map(|s| *s));
                Some(json!({ "id": id, "action": "route", "url": url, "abort": abort, "body": body }))
            }
            Some("unroute") => Some(json!({ "id": id, "action": "unroute", "url": rest.get(1) })),
            Some("requests") => {
                let clear = rest.iter().any(|&s| s == "--clear");
                let filter_idx = rest.iter().position(|&s| s == "--filter");
                let filter = filter_idx.and_then(|i| rest.get(i + 1).map(|s| *s));
                Some(json!({ "id": id, "action": "requests", "clear": clear, "filter": filter }))
            }
            _ => None,
        },
        
        // === Storage ===
        "storage" => match rest.get(0).map(|s| *s) {
            Some("local") | Some("session") => {
                let storage_type = rest.get(0)?;
                let op = rest.get(1).unwrap_or(&"get");
                let key = rest.get(2);
                let value = rest.get(3);
                Some(json!({ "id": id, "action": "storage", "storageType": storage_type, "operation": op, "key": key, "value": value }))
            }
            _ => None,
        },
        
        // === Cookies ===
        "cookies" => {
            let op = rest.get(0).unwrap_or(&"get");
            match *op {
                "get" => Some(json!({ "id": id, "action": "cookies", "operation": "get", "name": rest.get(1) })),
                "set" => Some(json!({ "id": id, "action": "cookies", "operation": "set", "name": rest.get(1)?, "value": rest.get(2)? })),
                "clear" => Some(json!({ "id": id, "action": "cookies", "operation": "clear" })),
                _ => Some(json!({ "id": id, "action": "cookies", "operation": "get" })),
            }
        }
        
        // === Tabs ===
        "tab" => match rest.get(0).map(|s| *s) {
            Some("new") => Some(json!({ "id": id, "action": "tab_new", "url": rest.get(1) })),
            Some("list") => Some(json!({ "id": id, "action": "tab_list" })),
            Some("close") => Some(json!({ "id": id, "action": "tab_close", "index": rest.get(1).and_then(|s| s.parse::<i32>().ok()) })),
            Some(n) if n.parse::<i32>().is_ok() => Some(json!({ "id": id, "action": "tab_switch", "index": n.parse::<i32>().unwrap() })),
            _ => Some(json!({ "id": id, "action": "tab_list" })),
        },
        
        // === Window ===
        "window" => match rest.get(0).map(|s| *s) {
            Some("new") => Some(json!({ "id": id, "action": "window_new" })),
            _ => None,
        },
        
        // === Frame ===
        "frame" => {
            if rest.get(0).map(|s| *s) == Some("main") {
                Some(json!({ "id": id, "action": "frame_main" }))
            } else {
                Some(json!({ "id": id, "action": "frame", "selector": rest.get(0)? }))
            }
        }
        
        // === Dialog ===
        "dialog" => match rest.get(0).map(|s| *s) {
            Some("accept") => Some(json!({ "id": id, "action": "dialog", "response": "accept", "promptText": rest.get(1) })),
            Some("dismiss") => Some(json!({ "id": id, "action": "dialog", "response": "dismiss" })),
            _ => None,
        },
        
        // === Debug ===
        "trace" => match rest.get(0).map(|s| *s) {
            Some("start") => Some(json!({ "id": id, "action": "trace_start", "path": rest.get(1) })),
            Some("stop") => Some(json!({ "id": id, "action": "trace_stop", "path": rest.get(1) })),
            _ => None,
        },
        "console" => {
            let clear = rest.iter().any(|&s| s == "--clear");
            Some(json!({ "id": id, "action": "console", "clear": clear }))
        }
        "errors" => {
            let clear = rest.iter().any(|&s| s == "--clear");
            Some(json!({ "id": id, "action": "errors", "clear": clear }))
        }
        "highlight" => Some(json!({ "id": id, "action": "highlight", "selector": rest.get(0)? })),
        
        // === State ===
        "state" => match rest.get(0).map(|s| *s) {
            Some("save") => Some(json!({ "id": id, "action": "state_save", "path": rest.get(1)? })),
            Some("load") => Some(json!({ "id": id, "action": "state_load", "path": rest.get(1)? })),
            _ => None,
        },
        
        _ => None,
    }
}

fn print_response(resp: &Response, json_mode: bool) {
    if json_mode {
        println!("{}", serde_json::to_string(resp).unwrap_or_default());
        return;
    }
    
    if !resp.success {
        eprintln!("\x1b[31m✗ Error:\x1b[0m {}", resp.error.as_deref().unwrap_or("Unknown error"));
        return;
    }
    
    if let Some(data) = &resp.data {
        // Navigation response
        if let Some(url) = data.get("url").and_then(|v| v.as_str()) {
            if let Some(title) = data.get("title").and_then(|v| v.as_str()) {
                println!("\x1b[32m✓\x1b[0m \x1b[1m{}\x1b[0m", title);
                println!("\x1b[2m  {}\x1b[0m", url);
                return;
            }
            println!("{}", url);
            return;
        }
        // Snapshot
        if let Some(snapshot) = data.get("snapshot").and_then(|v| v.as_str()) {
            println!("{}", snapshot);
            return;
        }
        // Title
        if let Some(title) = data.get("title").and_then(|v| v.as_str()) {
            println!("{}", title);
            return;
        }
        // Text
        if let Some(text) = data.get("text").and_then(|v| v.as_str()) {
            println!("{}", text);
            return;
        }
        // HTML
        if let Some(html) = data.get("html").and_then(|v| v.as_str()) {
            println!("{}", html);
            return;
        }
        // Value
        if let Some(value) = data.get("value").and_then(|v| v.as_str()) {
            println!("{}", value);
            return;
        }
        // Count
        if let Some(count) = data.get("count").and_then(|v| v.as_i64()) {
            println!("{}", count);
            return;
        }
        // Boolean results
        if let Some(visible) = data.get("visible").and_then(|v| v.as_bool()) {
            println!("{}", visible);
            return;
        }
        if let Some(enabled) = data.get("enabled").and_then(|v| v.as_bool()) {
            println!("{}", enabled);
            return;
        }
        if let Some(checked) = data.get("checked").and_then(|v| v.as_bool()) {
            println!("{}", checked);
            return;
        }
        // Eval result
        if let Some(result) = data.get("result") {
            println!("{}", serde_json::to_string_pretty(result).unwrap_or_default());
            return;
        }
        // Tabs
        if let Some(tabs) = data.get("tabs").and_then(|v| v.as_array()) {
            for (i, tab) in tabs.iter().enumerate() {
                let title = tab.get("title").and_then(|v| v.as_str()).unwrap_or("Untitled");
                let url = tab.get("url").and_then(|v| v.as_str()).unwrap_or("");
                let active = tab.get("active").and_then(|v| v.as_bool()).unwrap_or(false);
                let marker = if active { "→" } else { " " };
                println!("{} [{}] {} - {}", marker, i, title, url);
            }
            return;
        }
        // Console logs
        if let Some(logs) = data.get("logs").and_then(|v| v.as_array()) {
            for log in logs {
                let level = log.get("type").and_then(|v| v.as_str()).unwrap_or("log");
                let text = log.get("text").and_then(|v| v.as_str()).unwrap_or("");
                let color = match level {
                    "error" => "\x1b[31m",
                    "warning" => "\x1b[33m",
                    "info" => "\x1b[36m",
                    _ => "\x1b[0m",
                };
                println!("{}[{}]\x1b[0m {}", color, level, text);
            }
            return;
        }
        // Errors
        if let Some(errors) = data.get("errors").and_then(|v| v.as_array()) {
            for err in errors {
                let msg = err.get("message").and_then(|v| v.as_str()).unwrap_or("");
                println!("\x1b[31m✗\x1b[0m {}", msg);
            }
            return;
        }
        // Cookies
        if let Some(cookies) = data.get("cookies").and_then(|v| v.as_array()) {
            for cookie in cookies {
                let name = cookie.get("name").and_then(|v| v.as_str()).unwrap_or("");
                let value = cookie.get("value").and_then(|v| v.as_str()).unwrap_or("");
                println!("{}={}", name, value);
            }
            return;
        }
        // Bounding box
        if let Some(box_data) = data.get("box") {
            println!("{}", serde_json::to_string_pretty(box_data).unwrap_or_default());
            return;
        }
        // Closed
        if data.get("closed").is_some() {
            println!("\x1b[32m✓\x1b[0m Browser closed");
            return;
        }
        // Screenshot path
        if let Some(path) = data.get("path").and_then(|v| v.as_str()) {
            println!("\x1b[32m✓\x1b[0m Screenshot saved to {}", path);
            return;
        }
        // Default success
        println!("\x1b[32m✓\x1b[0m Done");
    }
}

fn print_help() {
    println!(r#"
agent-browser - fast browser automation CLI for AI agents

Usage: agent-browser <command> [args] [options]

Core Commands:
  open <url>                 Navigate to URL
  click <sel>                Click element (or @ref)
  dblclick <sel>             Double-click element
  type <sel> <text>          Type into element
  fill <sel> <text>          Clear and fill
  press <key>                Press key (Enter, Tab, Control+a)
  hover <sel>                Hover element
  focus <sel>                Focus element
  check <sel>                Check checkbox
  uncheck <sel>              Uncheck checkbox
  select <sel> <val>         Select dropdown option
  drag <src> <dst>           Drag and drop
  upload <sel> <files...>    Upload files
  scroll <dir> [px]          Scroll (up/down/left/right)
  scrollintoview <sel>       Scroll element into view
  wait <sel|ms>              Wait for element or time
  screenshot [path]          Take screenshot
  pdf <path>                 Save as PDF
  snapshot                   Accessibility tree with refs (for AI)
  eval <js>                  Run JavaScript
  close                      Close browser

Navigation:
  back                       Go back
  forward                    Go forward
  reload                     Reload page

Get Info:  agent-browser get <what> [selector]
  text, html, value, attr <name>, title, url, count, box

Check State:  agent-browser is <what> <selector>
  visible, enabled, checked

Find Elements:  agent-browser find <locator> <value> <action> [text]
  role, text, label, placeholder, alt, title, testid, first, last, nth

Mouse:  agent-browser mouse <action> [args]
  move <x> <y>, down [btn], up [btn], wheel <dy> [dx]

Browser Settings:  agent-browser set <setting> [value]
  viewport <w> <h>, device <name>, geo <lat> <lng>
  offline [on|off], headers <json>, credentials <user> <pass>
  media [dark|light] [reduced-motion]

Network:  agent-browser network <action>
  route <url> [--abort|--body <json>]
  unroute [url]
  requests [--clear] [--filter <pattern>]

Storage:
  cookies [get|set|clear]    Manage cookies
  storage <local|session>    Manage web storage

Tabs:
  tab [new|list|close|<n>]   Manage tabs

Debug:
  trace start|stop [path]    Record trace
  console [--clear]          View console logs
  errors [--clear]           View page errors
  highlight <sel>            Highlight element

Setup:
  install                    Install browser binaries
  install --with-deps        Also install system dependencies (Linux)

Snapshot Options:
  -i, --interactive          Only interactive elements
  -c, --compact              Remove empty structural elements
  -d, --depth <n>            Limit tree depth
  -s, --selector <sel>       Scope to CSS selector

Options:
  --session <name>           Isolated session (or AGENT_BROWSER_SESSION env)
  --json                     JSON output
  --full, -f                 Full page screenshot
  --headed                   Show browser window (not headless)
  --debug                    Debug output

Examples:
  agent-browser open example.com
  agent-browser snapshot -i              # Interactive elements only
  agent-browser click @e2                # Click by ref from snapshot
  agent-browser fill @e3 "test@example.com"
  agent-browser find role button click --name Submit
  agent-browser get text @e1
  agent-browser screenshot --full
"#);
}

fn run_install(with_deps: bool) {
    let is_linux = cfg!(target_os = "linux");
    
    if is_linux {
        if with_deps {
            println!("\x1b[36mInstalling system dependencies...\x1b[0m");
            
            let (pkg_mgr, deps) = if which_exists("apt-get") {
                ("apt-get", vec![
                    "libxcb-shm0", "libx11-xcb1", "libx11-6", "libxcb1", "libxext6",
                    "libxrandr2", "libxcomposite1", "libxcursor1", "libxdamage1", "libxfixes3",
                    "libxi6", "libgtk-3-0", "libpangocairo-1.0-0", "libpango-1.0-0", "libatk1.0-0",
                    "libcairo-gobject2", "libcairo2", "libgdk-pixbuf-2.0-0", "libxrender1",
                    "libasound2", "libfreetype6", "libfontconfig1", "libdbus-1-3", "libnss3",
                    "libnspr4", "libatk-bridge2.0-0", "libdrm2", "libxkbcommon0", "libatspi2.0-0",
                    "libcups2", "libxshmfence1", "libgbm1",
                ])
            } else if which_exists("dnf") {
                ("dnf", vec![
                    "nss", "nspr", "atk", "at-spi2-atk", "cups-libs", "libdrm",
                    "libXcomposite", "libXdamage", "libXrandr", "mesa-libgbm", "pango",
                    "alsa-lib", "libxkbcommon", "libxcb", "libX11-xcb", "libX11", "libXext",
                    "libXcursor", "libXfixes", "libXi", "gtk3", "cairo-gobject",
                ])
            } else if which_exists("yum") {
                ("yum", vec![
                    "nss", "nspr", "atk", "at-spi2-atk", "cups-libs", "libdrm",
                    "libXcomposite", "libXdamage", "libXrandr", "mesa-libgbm", "pango",
                    "alsa-lib", "libxkbcommon",
                ])
            } else {
                eprintln!("\x1b[31m✗\x1b[0m No supported package manager found (apt-get, dnf, or yum)");
                exit(1);
            };
            
            let install_cmd = match pkg_mgr {
                "apt-get" => format!("sudo apt-get update && sudo apt-get install -y {}", deps.join(" ")),
                _ => format!("sudo {} install -y {}", pkg_mgr, deps.join(" ")),
            };
            
            println!("Running: {}", install_cmd);
            let status = Command::new("sh")
                .arg("-c")
                .arg(&install_cmd)
                .status();
            
            match status {
                Ok(s) if s.success() => println!("\x1b[32m✓\x1b[0m System dependencies installed"),
                Ok(_) => eprintln!("\x1b[33m⚠\x1b[0m Failed to install some dependencies. You may need to run manually with sudo."),
                Err(e) => eprintln!("\x1b[33m⚠\x1b[0m Could not run install command: {}", e),
            }
        } else {
            println!("\x1b[33m⚠\x1b[0m Linux detected. If browser fails to launch, run:");
            println!("  agent-browser install --with-deps");
            println!("  or: npx playwright install-deps chromium");
            println!();
        }
    }
    
    println!("\x1b[36mInstalling Chromium browser...\x1b[0m");
    let status = Command::new("npx")
        .args(["playwright", "install", "chromium"])
        .status();
    
    match status {
        Ok(s) if s.success() => {
            println!("\x1b[32m✓\x1b[0m Chromium installed successfully");
            if is_linux && !with_deps {
                println!();
                println!("\x1b[33mNote:\x1b[0m If you see \"shared library\" errors when running, use:");
                println!("  agent-browser install --with-deps");
            }
        }
        Ok(_) => {
            eprintln!("\x1b[31m✗\x1b[0m Failed to install browser");
            if is_linux {
                println!("\x1b[33mTip:\x1b[0m Try installing system dependencies first:");
                println!("  agent-browser install --with-deps");
            }
            exit(1);
        }
        Err(e) => {
            eprintln!("\x1b[31m✗\x1b[0m Failed to run npx: {}", e);
            eprintln!("Make sure Node.js is installed and npx is in your PATH");
            exit(1);
        }
    }
}

fn which_exists(cmd: &str) -> bool {
    Command::new("which")
        .arg(cmd)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    let flags = parse_flags(&args);
    let clean = clean_args(&args);
    
    if clean.is_empty() || args.iter().any(|a| a == "--help" || a == "-h") {
        print_help();
        return;
    }
    
    // Handle install separately
    if clean.get(0).map(|s| s.as_str()) == Some("install") {
        let with_deps = args.iter().any(|a| a == "--with-deps" || a == "-d");
        run_install(with_deps);
        return;
    }
    
    let cmd = match parse_command(&clean, &flags) {
        Some(c) => c,
        None => {
            eprintln!("\x1b[31mUnknown command:\x1b[0m {}", clean.get(0).unwrap_or(&String::new()));
            eprintln!("\x1b[2mRun: agent-browser --help\x1b[0m");
            exit(1);
        }
    };
    
    if let Err(e) = ensure_daemon(&flags.session, flags.headed) {
        if flags.json {
            println!(r#"{{"success":false,"error":"{}"}}"#, e);
        } else {
            eprintln!("\x1b[31m✗ Error:\x1b[0m {}", e);
        }
        exit(1);
    }
    
    // If --headed flag is set, send launch command first to switch to headed mode
    if flags.headed {
        let launch_cmd = json!({ "id": gen_id(), "action": "launch", "headless": false });
        if let Err(e) = send_command(launch_cmd, &flags.session) {
            if !flags.json {
                eprintln!("\x1b[33m⚠\x1b[0m Could not switch to headed mode: {}", e);
            }
        }
    }
    
    match send_command(cmd, &flags.session) {
        Ok(resp) => {
            let success = resp.success;
            print_response(&resp, flags.json);
            if !success {
                exit(1);
            }
        }
        Err(e) => {
            if flags.json {
                println!(r#"{{"success":false,"error":"{}"}}"#, e);
            } else {
                eprintln!("\x1b[31m✗ Error:\x1b[0m {}", e);
            }
            exit(1);
        }
    }
}
