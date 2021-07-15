const { createReadStream , createWriteStream, WriteStream } = require('fs');
const { Transform, pipeline } = require('stream');
const util = require('util');
const EventEmitter = require('events');

class MyEmitter extends EventEmitter {}

const myAPIemitter = new MyEmitter();

/** Get the argument (filename) from user */
const filename = process.argv[2];
const type = process.argv[3];

const write_stream = createWriteStream('output.' + type);

const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

var numapi = 0;
var numpump = 0;

const api = (callback) => {
	setTimeout(() => {
		callback(Math.random() < 0.5);
	}, getRandomInt(10, 250));
};

/** temporary string buffer for aggregation */
var buffer_str= '';
var buffer_array_str = [];
/** temporary json buffer for aggregation */
var buffer_obj = [];

var countlines = 0;

async function pump() {
	var pos;
	while ((pos = buffer_str.indexOf('\n')) >= 0) {
		let line;
		if ((buffer_str[pos-1]) == ','){
			countlines++;
			line = buffer_str.slice(0,pos-1); 		// remove '}' '\n'
			let obj = JSON.parse(line);
			api((status) => {
				numapi++;
				obj["status"] = status;
				buffer_obj.push(obj);
				if (numapi == 250000) {
					myAPIemitter.emit('event', writeOutput)
				}
			})
		}
		else if ((buffer_str[pos-1]) == '}'){
			countlines++;
			line = buffer_str.slice(0,pos); 		// remove '\n'
			let obj = JSON.parse(line);
			api((status) => {
				numapi++;
				obj["status"] = status;
				buffer_obj.push(obj);
				if (numapi == 250000) {
					myAPIemitter.emit('event', writeOutput)
				}
			})
		}
		buffer_str = buffer_str.slice(pos+1); 		// put the '\n'
	}
}

function writeOutput() {
	buffer_str = JSON.stringify(buffer_obj);
	var pos;
	var line;

	pos = buffer_str.indexOf('[');
	line = buffer_str.slice(0,pos+1);
	write_stream.write(util.format('%s\n',line));

	buffer_str = buffer_str.slice(pos+1);
	while((pos = buffer_str.indexOf('}')) >= 0) {
		if (buffer_str[pos+1] == ',') {
			line = buffer_str.slice(0, pos+1);
			write_stream.write(util.format('\t%s,\n',line));
		}
		else {
			line = buffer_str.slice(0, pos+1);
			write_stream.write(util.format('\t%s\n]\n',line));
		}
		buffer_str = buffer_str.slice(pos+2);
	}
}

var before = process.hrtime();
pipeline(
	createReadStream(filename),
	async function * transform(source) {
		for await (let chunk of source) {
			buffer_str += chunk.toString();
			await pump();
		}
	},
	(error) => {
		if (error) {
			console.log(error);
			return;
		}
		else {
			console.log('Pipeline succeeded!')
			myAPIemitter.on('event', function(writeOutput) {
				writeOutput();
			});

			var took = process.hrtime(before);
			console.log('Create Dataset took: ' + took);

			console.log('Streaming process end succesfully!');
		}
	}
);
