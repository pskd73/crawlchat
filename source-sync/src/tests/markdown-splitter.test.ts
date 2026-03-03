import assert from "node:assert";
import { test } from "node:test";
import { splitMarkdown } from "../scrape/markdown-splitter";

test("splitMarkdown returns simple markdown", async () => {
  const markdown = `Hello how are you?`;
  const chunks = splitMarkdown(markdown);
  assert.strictEqual(chunks.length, 1);
  assert.strictEqual(chunks[0], markdown);
});

test("splitMarkdown splits simple markdown", async () => {
  const markdown = `Hello how are you?`;
  const chunks = splitMarkdown(markdown, { size: 10 });
  assert.strictEqual(chunks.length, 2);
  assert.strictEqual(chunks[0], markdown.slice(0, 10));
  assert.strictEqual(chunks[1], markdown.slice(10));
});

test("splitMarkdown splits multiple lines", async () => {
  const markdown = `Hello how are you?
Just!
This is a test`;
  const chunks = splitMarkdown(markdown, { size: 10 });
  assert.strictEqual(chunks.length, 5);
  assert.strictEqual(chunks[0], "Hello how ");
  assert.strictEqual(chunks[1], "are you?");
  assert.strictEqual(chunks[2], "Just!");
  assert.strictEqual(chunks[3], "This is a ");
  assert.strictEqual(chunks[4], "test");
});

const simpleHeadingMarkdown = `# Heading 1
## Heading 1.1
A line about heading 1.1 and a long line that should be split into multiple chunks
## Heading 1.2
A line about heading 1.2 and a long line that should be split into multiple chunks`;

test("splitMarkdown large size", async () => {
  const chunks = splitMarkdown(simpleHeadingMarkdown, { size: 2000 });
  assert.strictEqual(chunks.length, 1);
});

test("splitMarkdown heading carry forward varied size", async () => {
  const chunks = splitMarkdown(simpleHeadingMarkdown, { size: 200 });
  assert.strictEqual(chunks.length, 2);
  const lastChunk = chunks[chunks.length - 1];
  assert.strict(lastChunk.startsWith("# Heading 1"));
  assert.strict(!lastChunk.includes("## Heading 1.1"));
  assert.strict(lastChunk.includes("## Heading 1.2"));
});

test("splitMarkdown with context", async () => {
  const chunks = splitMarkdown(simpleHeadingMarkdown, {
    size: 100,
    context: "Test",
  });
  for (const chunk of chunks) {
    assert.strict(chunk.startsWith("Context: Test"));
  }
  for (const chunk of chunks) {
    assert.strict(chunk.length <= 100);
  }
});

const table = `| Header 1 | Header 2 |
|----------|----------|
| Data 1   | Data 2   |
| Data 3   | Data 4   |
| Data 5   | Data 6   |
| Data 7   | Data 8   |
| Data 9   | Data 10   |
| Data 11   | Data 12   |
| Data 13   | Data 14   |
| Data 15   | Data 16   |
| Data 17   | Data 18   |
| Data 19   | Data 20   |
| Data 21   | Data 22   |
| Data 23   | Data 24   |`;

test("splitMarkdown with table", async () => {
  const chunks = splitMarkdown(table, { size: 200 });
  assert.strictEqual(chunks.length, 3);
  const headers = "| Header 1 | Header 2 |\n|----------|----------|";
  for (let i = 1; i < chunks.length; i++) {
    assert.strict(chunks[i].startsWith(headers));
  }
});

test("splitMarkdown with table and following text", async () => {
  const text = "I am Pramod";
  const chunks = splitMarkdown(`${table}\n\n${text}`, { size: 200 });
  assert.strict(chunks.pop()?.endsWith("I am Pramod"));
});

test("splitMarkdown with headers and table", async () => {
  const markdown = `# Heading 1
This is a text
| Name | Country |
| ---- | ------- |
| Pramod | India |
| John | USA |
| Jane | Canada |
| Jim | Australia |
| Jill | New Zealand |
| Jack | South Africa |
| Jill | New Zealand |`;

  const chunks = splitMarkdown(markdown, { size: 150 });
  assert.strictEqual(chunks.length, 2);
  assert.strict(chunks[0].startsWith("# Heading 1"));
  assert.strict(chunks[1].startsWith("# Heading 1"));
  assert.strict(chunks[0].includes("| Name | Country |"));
  assert.strict(chunks[1].includes("| Name | Country |"));

  const chunks2 = splitMarkdown(markdown, { size: 190 });
  assert.strictEqual(chunks2.length, 2);
  assert.strictEqual(
    chunks2[1],
    "# Heading 1\n| Name | Country |\n| ---- | ------- |\n| Jill | New Zealand |"
  );
});

const paragraph = `The person who digs the ground for construction is someone whose work quietly shapes everything that comes after, standing at the very beginning of buildings, roads, and cities, turning solid earth into possibility with strength, patience, and precision. Whether using a shovel under the hot sun or guiding a massive machine with careful hands, they read the land like a language—understanding soil, rock, moisture, and depth—knowing exactly how much to remove and where to stop so that others can safely build on what they leave behind. Their job is physical and often exhausting, yet deeply technical, requiring awareness of measurements, safety lines, buried utilities, and structural plans that most people never think about once the concrete is poured. Mud-caked boots, dust-covered clothes, and long hours are part of the routine, but so is the quiet satisfaction of seeing a flat, clean foundation where there was once uneven ground, chaos turned into order. Long before walls rise or roofs take shape, this person’s work disappears beneath the surface, unseen but essential, holding up everything above it without ever asking for attention or credit.`;

test("splitMarkdown with long paragraph", async () => {
  const markdown = `# Heading
${paragraph}`;

  const chunks = splitMarkdown(markdown, { size: 100 });
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    assert.strict(chunk.length <= 100);
    if (i > 0) {
      assert.strict(chunk.startsWith("# Heading\n"));
    }
  }
});

test("splitMarkdown with long paragraph", async () => {
  const markdown = `# Heading 1
${paragraph}

# Heading 2

${paragraph}

## Heading 2.1

${paragraph}

${table}

## Heading 2.2

${table}`;

  const chunks = splitMarkdown(markdown, { size: 500 });
  assert.strictEqual(chunks.length, 11);
  assert.strict(
    chunks
      .pop()
      ?.startsWith(
        "# Heading 2\n## Heading 2.2\n| Header 1 | Header 2 |\n|----------|----------|"
      )
  );
});

test("splitMarkdown check every line exists", async () => {
  const markdown = `---
__Advertisement :)__

- __[pica](https://nodeca.github.io/pica/demo/)__ - high quality and fast image
  resize in browser.
- __[babelfish](https://github.com/nodeca/babelfish/)__ - developer friendly
  i18n with plurals support and easy syntax.

You will like those projects!

---

# h1 Heading 8-)
## h2 Heading
### h3 Heading
#### h4 Heading
##### h5 Heading
###### h6 Heading


## Horizontal Rules

___

---

***


## Typographic replacements

Enable typographer option to see result.

(c) (C) (r) (R) (tm) (TM) (p) (P) +-

test.. test... test..... test?..... test!....

!!!!!! ???? ,,  -- ---

"Smartypants, double quotes" and 'single quotes'


## Emphasis

**This is bold text**

__This is bold text__

*This is italic text*

_This is italic text_

~~Strikethrough~~


## Blockquotes


> Blockquotes can also be nested...
>> ...by using additional greater-than signs right next to each other...
> > > ...or with spaces between arrows.


## Lists

Unordered

+ Create a list by starting a line with \`+\`, \`-\`, or \`*\`
+ Sub-lists are made by indenting 2 spaces:
  - Marker character change forces new list start:
    * Ac tristique libero volutpat at
    + Facilisis in pretium nisl aliquet
    - Nulla volutpat aliquam velit
+ Very easy!

Ordered

1. Lorem ipsum dolor sit amet
2. Consectetur adipiscing elit
3. Integer molestie lorem at massa


1. You can use sequential numbers...
1. ...or keep all the numbers as \`1.\`

Start numbering with offset:

57. foo
1. bar


## Code

Inline \`code\`

Indented code

    // Some comments
    line 1 of code
    line 2 of code
    line 3 of code


Block code "fences"

\`\`\`
Sample text here...
\`\`\`

Syntax highlighting

\`\`\` js
var foo = function (bar) {
  return bar++;
};

console.log(foo(5));
\`\`\`

## Tables

| Option | Description |
| ------ | ----------- |
| data   | path to data files to supply the data that will be passed into templates. |
| engine | engine to be used for processing templates. Handlebars is the default. |
| ext    | extension to be used for dest files. |

Right aligned columns

| Option | Description |
| ------:| -----------:|
| data   | path to data files to supply the data that will be passed into templates. |
| engine | engine to be used for processing templates. Handlebars is the default. |
| ext    | extension to be used for dest files. |


## Links

[link text](http://dev.nodeca.com)

[link with title](http://nodeca.github.io/pica/demo/ "title text!")

Autoconverted link https://github.com/nodeca/pica (enable linkify to see)


## Images

![Minion](https://octodex.github.com/images/minion.png)
![Stormtroopocat](https://octodex.github.com/images/stormtroopocat.jpg "The Stormtroopocat")

Like links, Images also have a footnote style syntax

![Alt text][id]

With a reference later in the document defining the URL location:

[id]: https://octodex.github.com/images/dojocat.jpg  "The Dojocat"


## Plugins

The killer feature of \`markdown-it\` is very effective support of
[syntax plugins](https://www.npmjs.org/browse/keyword/markdown-it-plugin).


### [Emojies](https://github.com/markdown-it/markdown-it-emoji)

> Classic markup: :wink: :cry: :laughing: :yum:
>
> Shortcuts (emoticons): :-) :-( 8-) ;)

see [how to change output](https://github.com/markdown-it/markdown-it-emoji#change-output) with twemoji.


### [Subscript](https://github.com/markdown-it/markdown-it-sub) / [Superscript](https://github.com/markdown-it/markdown-it-sup)

- 19^th^
- H~2~O


### [\<ins>](https://github.com/markdown-it/markdown-it-ins)

++Inserted text++


### [\<mark>](https://github.com/markdown-it/markdown-it-mark)

==Marked text==


### [Footnotes](https://github.com/markdown-it/markdown-it-footnote)

Footnote 1 link[^first].

Footnote 2 link[^second].

Inline footnote^[Text of inline footnote] definition.

Duplicated footnote reference[^second].

[^first]: Footnote **can have markup**

    and multiple paragraphs.

[^second]: Footnote text.


### [Definition lists](https://github.com/markdown-it/markdown-it-deflist)

Term 1

:   Definition 1
with lazy continuation.

Term 2 with *inline markup*

:   Definition 2

        { some code, part of Definition 2 }

    Third paragraph of definition 2.

_Compact style:_

Term 1
  ~ Definition 1

Term 2
  ~ Definition 2a
  ~ Definition 2b


### [Abbreviations](https://github.com/markdown-it/markdown-it-abbr)

This is HTML abbreviation example.

It converts "HTML", but keep intact partial entries like "xxxHTMLyyy" and so on.

*[HTML]: Hyper Text Markup Language

### [Custom containers](https://github.com/markdown-it/markdown-it-container)

::: warning
*here be dragons*
:::
`;

  const chunks = splitMarkdown(markdown, { size: 500 });
  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    assert.strict(chunks.some((chunk) => chunk.includes(line)));
  }
});
