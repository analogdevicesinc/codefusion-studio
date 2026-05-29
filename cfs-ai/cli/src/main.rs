/*
 * Copyright (c) 2025-2026 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

use std::env;
use std::fmt;
use std::path::PathBuf;
use std::process::{Command, exit};
use std::sync::atomic::{AtomicBool, Ordering};

#[cfg(target_os = "windows")]
const CFSUTIL_BINARY: &str = "cfsutil.cmd";

#[cfg(not(target_os = "windows"))]
const CFSUTIL_BINARY: &str = "cfsutil";

static HAS_JSON: AtomicBool = AtomicBool::new(false);

pub fn has_json() -> bool {
    HAS_JSON.load(Ordering::Relaxed)
}

pub fn set_json_enabled(v: bool) {
    HAS_JSON.store(v, Ordering::Relaxed);
}


/// Determine the cfsutil executable path.
fn get_cfsutil_path() -> Result<PathBuf, String> {
    let exe_dir = env::current_exe()
        .map_err(|e| format!("Error determining executable path: {}", e))?
        .parent()
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
        .map(|p| p.join("Utils").join("cfsutil").join("bin"))
        .ok_or_else(|| "Error: Unable to determine parent directory of executable.".to_string())?;

    Ok(exe_dir.join(CFSUTIL_BINARY))
}

#[derive(PartialEq)]
enum DiagLevel {
    Error,
    Warning,
    Info
}


macro_rules! log {
    ($level:expr, $($arg:tt)*) => {
        log_fn($level, format_args!($($arg)*))
    };
}

/// Logging function. Don't emit if --json is set, because we can't
/// integrate with the json output from cfsutil.

fn log_fn(level: DiagLevel, args: fmt::Arguments) {
   if !has_json() {
        match level {
            DiagLevel::Error => {
                eprintln!("Error: {}", args);
            }
            DiagLevel::Warning => {
                println!("Warning: {}", args);
            }
            DiagLevel::Info => {
                println!("Info: {}", args);
            }
        }
    }
}


/// Try to expand a `--target` value of the form:
///   SOC[PACKAGE?].CORE.ACCELERATOR?
/// Examples:
///   "MAX78002[CSBGA].CM4.CNN" -> --soc MAX78002 --package CSBGA --core CM4 --acc CNN
///   "MAX78002.CM4"            -> --soc MAX78002 --core CM4
///   "MAX78002[CSBGA].CM4"     -> --soc MAX78002 --package CSBGA --core CM4
fn expand_target_value(value: &str) -> Option<Vec<String>> {
    let v = value.trim();
    if v.is_empty() {
        return None;
    }

    // Parse SOC and optional [PACKAGE]
    let (soc, rest_after_pkg, package) = if let Some(l_br) = v.find('[') {
        // Has bracket; require a matching ']'
        let r_br = v[l_br + 1..].find(']')?;
        let r_br = l_br + 1 + r_br;
        let soc = v[..l_br].trim();
        let package = v[l_br + 1..r_br].trim();
        // Remainder may start with '.' after the closing ']'
        let mut idx = r_br + 1;
        if v[idx..].starts_with('.') {
            idx += 1;
        }
        (soc, v.get(idx..).unwrap_or("").trim(), Some(package))
    } else {
        // No package; SOC ends at first '.' (if any)
        if let Some(dot) = v.find('.') {
            (v[..dot].trim(), v[dot + 1..].trim(), None)
        } else {
            // Only SOC present; nothing else to expand (need at least CORE to be useful)
            (v, "", None)
        }
    };

    if soc.is_empty() {
        return None;
    }

    // Parse remainder: CORE[.ACCELERATOR?]
    let mut core: Option<&str> = None;
    let mut acc: Option<&str> = None;

    if !rest_after_pkg.is_empty() {
        let mut pieces = rest_after_pkg.split('.').filter(|s| !s.is_empty());
        core = pieces.next().map(str::trim).filter(|s| !s.is_empty());
        acc = pieces.next().map(str::trim).filter(|s| !s.is_empty());
        // Ignore any additional segments beyond acc
    }

    // We require at least a CORE to perform the rewrite; otherwise return None (fallback)
    let core = core?;
    let mut out = Vec::with_capacity(8);
    out.push("--soc".to_string());
    out.push(soc.to_string());

    if let Some(pkg) = package {
        if !pkg.is_empty() {
            out.push("--package".to_string());
            out.push(pkg.to_string());
        }
    }

    out.push("--core".to_string());
    out.push(core.to_string());

    if let Some(acc) = acc {
        if !acc.is_empty() {
            out.push("--acc".to_string());
            out.push(acc.to_string());
        }
    }

    Some(out)
}

/// Transform CLI arguments
/// Doesn't check arguments are valid for a command
fn transform_args(in_args: &Vec<String>) -> Vec<String>
{
    const REMOVED_FLAGS: &[&str] = &["--firmware-platform", "--no-path-checks", "--verbose"];
    let mut out: Vec<String> = Vec::new();
    let mut later: Vec<String> = Vec::new();
    let mut it = in_args.into_iter();
    let mut output_file_used: bool = false;
    let mut is_compat: bool = false;

    while let Some(arg) = it.next() {
        if REMOVED_FLAGS.contains(&arg.as_str()) {
            log!(DiagLevel::Warning, "ignoring deprecated flag '{}'", arg);
            continue;
        }

        if arg == "--json" {
            later.push("--json".to_string());
            continue;
        }

        if arg == "compat" {
            is_compat = true;
            out.push(arg.to_string());
            continue;
        }

        if arg == "--datamodel-file" {
            if let Some(val) = it.next() {
                log!(DiagLevel::Warning, "ignoring deprecated flag '{} {}'", arg, val);
            } else {
                log!(DiagLevel::Error, "--datamodel-file expects a file value");
                exit(1);
            }
            continue;
        }
        // `--datamodel-file=value`
        if let Some(_rest) = arg.strip_prefix("--datamodel-file=") {
            log!(DiagLevel::Warning, "ignoring deprecated flag '{}'", arg);
            continue;
        }

        if arg == "--datamodel-search-path" {
            if let Some(val) = it.next() {
                later.push("--search-path".to_string());
                later.push(val.to_string());
            } else {
                log!(DiagLevel::Error, "--datamodel-search-path expects a file value");
                exit(1);
            }
            continue;
        }
        // `--datamodel-search-path=value`
        if let Some(rest) = arg.strip_prefix("--datamodel-search-path=") {
            later.push("--search-path".to_string());
            later.push(rest.to_string());
            continue;
        }

        if arg == "--izer-network-config" {
            if let Some(val) = it.next() {
                out.push("--network-config".to_string());
                out.push(val.to_string());
            } else {
                log!(DiagLevel::Error, "--izer-network-config expects a file value");
                exit(1);
            }
            continue;
        }

        if arg == "--json-file" {
            if let Some(val) = it.next() {
                if output_file_used {
                    log!(DiagLevel::Warning, "--json-file or --text-file already specified, ignoring '{}'", arg);
                } else {
                    out.push("--report-file".to_string());
                    out.push(val.to_string());
                    if !is_compat {
                        out.push("--report-format=json".to_string());
                    }
                    output_file_used = true;
                }
            } else {
                log!(DiagLevel::Error, "--json-file expects a file value");
                exit(1);
            }
            continue
        }
        // `--json-file=value`
        if let Some(rest) = arg.strip_prefix("--json-file=") {
            if output_file_used {
                log!(DiagLevel::Warning, "--json-file or --text-file already specified, ignoring '{}'", arg);
            } else {
                out.push("--report-file".to_string());
                out.push(rest.to_string());
                if !is_compat {
                    out.push("--report-format=json".to_string());
                }
                output_file_used = true;
            }
            continue;
        }

        if arg == "--text-file" {
            if let Some(val) = it.next() {
                if output_file_used {
                    log!(DiagLevel::Warning, "--json-file or --text-file already specified, ignoring '{}'", arg);
                } else {
                    out.push("--report-file".to_string());
                    out.push(val.to_string());
                    out.push("--report-format=text".to_string());
                    output_file_used = true;
                }
            } else {
                log!(DiagLevel::Error, "--text-file expects a file value");
                exit(1);
            }
            continue
        }
        // `--text-file=value`
        if let Some(rest) = arg.strip_prefix("--text-file=") {
            if output_file_used {
                log!(DiagLevel::Warning, "--json-file or --text-file already specified, ignoring '{}'", arg);
            } else {
                out.push("--report-file".to_string());
                out.push(rest.to_string());
                out.push("--report-format=text".to_string());
                output_file_used = true;
            }
            continue;
        }

        // `--t(arget)=value`
        if let Some(rest) = arg
            .strip_prefix("--target=")
            .or_else(|| arg.strip_prefix("-t="))
        {
            if let Some(expanded) = expand_target_value(rest) {
                out.extend(expanded);
            } else {
                log!(DiagLevel::Warning, "ignoring incomplete flag '{}'", arg);
            }
            continue;
        }

        // `--t(arget) value`
        if arg == "--target" || arg == "-t" {
            if let Some(val) = it.next() {
                if let Some(expanded) = expand_target_value(&val) {
                    out.extend(expanded);
                } else {
                    log!(DiagLevel::Warning, "ignoring incomplete flag '{}'", arg);
                }
            } else {
                log!(DiagLevel::Warning, "ignoring incomplete flag '{}'", arg);
            }
            continue;
        }

        // Flag doesn't need to change, pass through
        out.push(arg.to_string());
    }

    out.extend(later);
    out
}

fn check_for_removed_command(in_args: &Vec<String>) -> (bool, Vec<String>)
{
    const TARGETS: &[&str] = &["socs", "list"];
    const EXTENSIONS: &[&str] = &["ai", "backends", "list", "--name"];
    const BACKENDS: &[&str] = &["ai", "backends", "list"];

    let mut found = false;
    let mut args: Vec<String> = Vec::new();

    match in_args.get(0).map(|s| s.as_str()) {
        Some("list-targets") => {
            found = true;
            args.extend(TARGETS.iter().copied().map(str::to_owned));
        }
        Some("list-extensions") => {
            if let Some(next) = in_args.get(1) {
                found = true;
                args.extend(EXTENSIONS.iter().copied().map(str::to_owned));
                args.push(next.clone());
            } else {
                log!(DiagLevel::Error, "list-extensions requires a backend");
                exit(1); 
            }
        }
        Some("list-backends") => {
            found = true;
            args.extend(BACKENDS.iter().copied().map(str::to_owned));
        }
        Some("export") => {
            log!(DiagLevel::Error, "`export` is no longer supported.");
            exit(1);
        }
        _ => {}
    }

    (found, args)
}

/// Returns (flags, remaining_args)
fn strip_leading_flags(raw_args: &[String]) -> (bool, bool, Vec<String>) {
    let mut new_args = Vec::new();

    let mut in_flags:bool = true;
    let mut found_json:bool = false;
    let mut found_version:bool = false;

    for arg in raw_args {
        if in_flags && arg.starts_with('-') {
            if arg == "--json" {
                found_json = true;
            }
            if arg == "--version" {
                found_version = true;
            }
            continue;
        } else {
            in_flags = false;
            new_args.push(arg.clone());
        }
    }

    (found_json, found_version, new_args)
}

fn main() {
    // Determine the Python path
    let cfsutil_path = match get_cfsutil_path() {
        Ok(path) => path,
        Err(err) => {
            eprintln!("{}", err);
            exit(1);
        }
    };

    let raw_args: Vec<String> = env::args().skip(1).collect();
    if raw_args.is_empty() {
        eprintln!("Error: no arguments provided");
        exit(1);
    }

    let (found_json, found_version, trimmed_args) = strip_leading_flags(&raw_args);
    if found_json {
        set_json_enabled(true);
    }

    // Check for replaced commands
    let mut args: Vec<String>;
    let found: bool;

    (found, args) = check_for_removed_command(&trimmed_args);

    if !found {
        // Transform args for matching functions
        args = transform_args(&raw_args);
        
        if !found_version {
            args.insert(0, "ai".to_string());
        }
    }

    log!(DiagLevel::Info,
        "Running: {} {}",
        cfsutil_path.display(),
        args.join(" ")
    );


    // Invoke cfsutil
    let status = Command::new(cfsutil_path)
        .args(&args)
        .status();

    match status {
        Ok(code) => exit(code.code().unwrap_or(1)),
        Err(e) => {
            eprintln!("Failed to start cfsutil process: {}", e);
            exit(1);
        }
    }
}

