#!/usr/bin/env node

const aesjs = require("aes-js");
const scrypt = require("scrypt-js");
const fs = require("fs");
const path = require("path");

const STR_VERIFY = "minna chiruno no sansei kyoushitsu hajimaru yo~";

function main()
{
  if (process.argv.length < 6) {
    show_help();
    process.exit();
  }
  
  let salt = "abc123!@#";
  
  // process default args
  let argc = 2;
  const page = process.argv[argc++];
  const login = process.argv[argc++];
  const pwd = process.argv[argc++];
  const out = process.argv[argc++];
  
  // process optional args
  while (argc < process.argv.length) {
    if (process.argv[argc] == "-s") {
      argc++;
      salt = process.argv[argc++];
    }
  }
  
  const key = gen_pwd(pwd, salt);
  encrypt_page(page, login, key, salt, out);
}

function show_help()
{
  const usage = [
    {
      name: "page",
      description: "path to html page to encrypt"
    },
    {
      name: "login",
      description: "path to html page for user login"
    },
    {
      name: "password",
      description: "password to encrypt with"
    },
    {
      name: "output",
      description: "path to output html page"
    }
  ];
  
  let str_usage = "Usage:\n  sccrpted <page> <login> <password> <output> [options]\n";
  for (const use of usage) {
    str_usage += "\n  ";
    str_usage += ("<" + use.name + ">:").padEnd(16);
    str_usage += use.description;
  }
  
  const options = [
    {
      name: "s <salt>",
      description: "use custom salt (default is 'abc123!@#')"
    }
  ];
  
  let str_option = "Options:";
  for (const option of options) {
    str_option += "\n  ";
    str_option += ("-" + option.name + ":").padEnd(16);
    str_option += option.description;
  }
  
  console.log(str_usage + "\n\n" + str_option);
}

function encrypt_page(page, login, key, salt, out)
{
  const in_html = fs.readFileSync(page, "utf8");

  const aes_ctr = new aesjs.ModeOfOperation.ctr(key);
  
  // Encrypt both the verify string and input html page and store as hex
  // Note that they both use the same 'aes_ctr' with the verification being
  // encrypted first then the page
  const enc_verify = aesjs.utils.hex.fromBytes(aes_ctr.encrypt(aesjs.utils.utf8.toBytes(STR_VERIFY), key));
  const byte_array = aesjs.utils.utf8.toBytes(in_html);
  const enc_in = aes_ctr.encrypt(byte_array, key);
  const enc_hex = aesjs.utils.hex.fromBytes(enc_in);
  
  // The template script to decrypt and load the page
  const script_path = path.resolve(__dirname, "script.html");
  
  // 'Flatten' out the final page by substituting the encrypted strings in
  // their respective places
  const login_html = fs.readFileSync(login, "utf8");
  const script_html = fs.readFileSync(script_path, "utf8");
  let out_html = script_html.replace("{{{$content}}}", enc_hex);
  out_html = out_html.replace("{{{$salt}}}", salt);
  out_html = out_html.replace("{{{$verify}}}", enc_verify);
  out_html = login_html.replace("{{{$script}}}", out_html);
  
  fs.writeFileSync(out, out_html);
  
  // Find and encrypt the files referenced in the input page
  encrypt_files(page, out, in_html, key);
}

function encrypt_files(page, out, in_html, key)
{
  // Only certain files are marked for encryption using
  // {{{$encrypt:file_name.ext}}}
  // Match these using regex
  const reg_exp = new RegExp(/{{{\$encrypt\:(.+)}}}/gm);
  const out_dir = path.dirname(out);

  let match = reg_exp.exec(in_html);
  while (match) {
    const aes_ctr = new aesjs.ModeOfOperation.ctr(key);
    
    const base = match[1]; // the directory + file given
    const in_path = path.join(path.dirname(page), base); // append it relative to the target page
    const byte_array = fs.readFileSync(in_path);
    const enc_text = aes_ctr.encrypt(byte_array);
    
    const out_path = path.join(out_dir, base);
    
    // ensure all asset folders exist, e.g. for 'out/res/image.png',  mkdir out/res
    if (!fs.existsSync(path.dirname(out_path)))
      fs.mkdirSync(path.dirname(out_path), { recursive: true });
    
    fs.writeFileSync(out_path + ".enc", enc_text);
    
    match = reg_exp.exec(in_html); // find the next match
  }
}

// generate a key using scrypt
function gen_pwd(pwd, salt)
{
  const bytes_pwd = aesjs.utils.utf8.toBytes(pwd.normalize("NFKC"));
  const bytes_salt = aesjs.utils.utf8.toBytes(salt.normalize("NFKC"));

  const N = 1024, r = 8, p = 1;
  const dkLen = 32;
  
  return scrypt.syncScrypt(bytes_pwd, bytes_salt, N, r, p, dkLen);
}

main();
