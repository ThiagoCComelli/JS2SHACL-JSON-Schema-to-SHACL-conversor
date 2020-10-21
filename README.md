# JS2SHACL - JSON Schema to SHACL conversor

JS2Shacl is a document conversor, makes conversions from JSON Schema to SHACL Schema (Turtle format).

- [https://shaclconversor.herokuapp.com/](https://shaclconversor.herokuapp.com/)
or
- [http://www.js2shacl.tk/](http://www.js2shacl.tk/)

### Installation

JS2Schacl requires [Node.js](https://nodejs.org/) to run. 
Install the dependencies [fs](https://www.npmjs.com/package/fs) and [perf_hooks](https://www.npmjs.com/package/perf_hooks).

### Executation

```sh
# Convert the especified file in /inputSchemas
# example: $ node app.js CaseStudy-GlobalSchema.json
$ node app.js <filename in /inputSchemas>
```
or

```sh
# Convert all files in /inputSchemas
$ node app.js -a
```

### Output
All analyzed files will be saved in the /outputSchemas folder, and a conversion log in the /outputLog folder.


