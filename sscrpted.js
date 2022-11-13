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
  
  let n_arg = 2;
  const page = process.argv[n_arg++];
  const login = process.argv[n_arg++];
  const pwd = process.argv[n_arg++];
  const out = process.argv[n_arg++];
  
  while (n_arg < process.argv.length) {
    if (process.argv[n_arg] == "-s") {
      n_arg++;
      salt = process.argv[n_arg++];
    }
  }
  
  const key = gen_pwd(pwd, salt);
  encrypt_page(page, login, key, salt, out);
}

function show_help()
{
  const usage = "Usage:\n  sccrpted <page> <login> <password> <output> [options]\n\n  <page>:     path to html page to encrypt\n  <login>:    path to html page for user login\n  <password>: password to encrypt with\n  <output>:   path to output '.html' page\n\n";
  const options = [
    {
      name: "s <salt>",
      description: "use custom salt (default is 'abc123!@#')"
    }
  ];
  
  let str_option = "Options:";
  for (const option of options) {
    str_option += "\n  ";
    str_option += ("-" + option.name + ":").padEnd(11);
    str_option += " " + option.description;
  }
  
  console.log(usage + str_option);
}

function encrypt_page(page, login, key, salt, out)
{
  const in_html = fs.readFileSync(page, "utf8");

  const aes_ctr = new aesjs.ModeOfOperation.ctr(key);

  const enc_verify = aesjs.utils.hex.fromBytes(aes_ctr.encrypt(aesjs.utils.utf8.toBytes(STR_VERIFY), key));
  const byte_array = aesjs.utils.utf8.toBytes(in_html);
  const enc_in = aes_ctr.encrypt(byte_array, key);
  const enc_hex = aesjs.utils.hex.fromBytes(enc_in);
  
  const script_path = path.resolve(__dirname, "script.html");
  
  const login_html = fs.readFileSync(login, "utf8");
  const script_html = fs.readFileSync(script_path, "utf8");
  let out_html = script_html.replace("{{{$content}}}", enc_hex);
  out_html = out_html.replace("{{{$salt}}}", salt);
  out_html = out_html.replace("{{{$verify}}}", enc_verify);
  out_html = login_html.replace("{{{$script}}}", out_html);
  
  fs.writeFileSync(out, out_html);
  
  encrypt_files(page, out, in_html, key);
}

function encrypt_files(page, out, in_html, key)
{
  const reg_exp = new RegExp(/{{{\$encrypt\:(.+)}}}/gm);
  const out_dir = path.dirname(out);

  let match = reg_exp.exec(in_html);
  while (match) {
    const aes_ctr = new aesjs.ModeOfOperation.ctr(key);
    
    const base = match[1];
    const in_path = path.join(path.dirname(page), base);
    const byte_array = fs.readFileSync(in_path);
    const enc_text = aes_ctr.encrypt(byte_array);
    
    const out_path = path.join(out_dir, base);
    
    if (!fs.existsSync(path.dirname(out_path)))
      fs.mkdirSync(path.dirname(out_path), { recursive: true });
    
    fs.writeFileSync(out_path + ".enc", enc_text);
    
    match = reg_exp.exec(in_html);
  }
}

function gen_pwd(pwd, salt)
{
  const bytes_pwd = aesjs.utils.utf8.toBytes(pwd.normalize("NFKC"));
  const bytes_salt = aesjs.utils.utf8.toBytes(salt.normalize("NFKC"));

  const N = 1024, r = 8, p = 1;
  const dkLen = 32;
  
  return scrypt.syncScrypt(bytes_pwd, bytes_salt, N, r, p, dkLen);
}

main();
