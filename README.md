# Posts

Copy-ready posts for Ko-fi, Facebook, Instagram and LinkedIn, with the pictures to go with them.
Live at https://posts.edgarasneverdauskas.com (not indexed by search engines). Same design as
[Articles](https://articles.edgarasneverdauskas.com).

## Add or change a post

1. Edit `content/posts.json`. Pictures go in `images/`.
2. Run `node build.mjs`. It writes `index.html`, and refuses to build if a text is over its
   platform's limit or a picture is missing.
3. Commit and push. GitHub Pages publishes `main`.

Limits: Ko-fi 700 (measured on Ko-fi's Description box), Instagram 2,200, LinkedIn 3,000,
Facebook 63,206.
