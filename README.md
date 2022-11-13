# Sscrpted

Sscrpted uses `AES-256` and `scrypt` to generate static password protected HTML
pages with assets such as scripts, images and stylesheets used.

[Example](https://vv4t.github.io/demo/pwd/)

# Install

`npm install sscrpted`

# Usage

```
Usage:
  sccrpted <page> <login> <password> <output> [options]

  <page>:     path to html page to encrypt
  <login>:    path to html page for user login
  <password>: password to encrypt with
  <output>:   path to output '.html' page

Options:
  -s <salt>:  use custom salt (default is 'abc123!@#')
```

## Page

All text contents of the HTML file will be encrypted.

You can mark external content to be encrypted by formatting it as such:
`{{{$encrypt:file_name.ext}}}`

### Example

```
<html>
  <head>
    <title>My Encrypted Website</title>
    <link href="{{{$encrypt:style.css}}}" rel="stylesheet"></link>
  </head>
  <body>
    Hello, World!
    <img src="{{{$encrypt:image.png}}}"></img>
  </body>
</html>

```

## Login Page

You can write a custom login page which is shown when logging into your
encrypted site.

This is done by embedding `{{{$script}}}` into your login page and using the
`page_login(password)` function.

### page_login(password)

`page_login()` takes in the site password as a string. If the password is
incorrect it will return false and vice versa if it is correct. However, if it
is correct, all current nodes will be deleted from the document.

Ensure that `{{{$script}}} `is embedded in the page before your script used to
login or it may be marked as undefined.

### Example

```
<html>
  <body>
    {{{$script}}}
    <script>
      while (!page_login(prompt("password:"))) {
        alert("incorrect password");
      }
    </script>
  </body>
</html>
```

# Options

| Option           | Description |
| :--              | :---        |
| `-s <salt>`      | You can specify the salt used to encrypt the website |

# How it works

- Sscrpted scans the target file for all instances matching a regex which marks
  a file to be encrypted and thus encrypts and saves it.

- It then also encrypts contents of the HTML page encoded in hex and is embedded
  into a script which is loaded with the login page.

- If the password is correct then the script will decrypt the encrypted html
  page and replace the current page with its contents.

- The script then recursively scans the nodes for `hrefs` or `src` attributes.
  Any found with a value matching a certain regex will have its encrypted
  equivalent file loaded and decrypted using the same key and stored in a blob.
  It will then replace the `href` or `src` value with a new blob url.

- Page scripts are then re executed by recreating the object and copying its
  contents into the new one, then replacing it.
