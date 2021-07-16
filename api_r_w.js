const { createReadStream , createWriteStream } = require('fs');
const { pipeline } = require('stream');
const util = require('util');
const EventEmitter = require('events');


/** BUFFERS **/
var buffer_str= ''; 
var buffer_obj = [];

/** Create my own Event Emitter */
class MyEmitter extends EventEmitter {}
const myAPIemitter = new MyEmitter();

/** USER ARGUMENTS **/
const filename = process.argv[2];		// Get input file name
const type = process.argv[3];			// Get the type of the output file

/** Create WriteStream **/
const write_stream = createWriteStream('output.' + type);

/*------- Given functions ---------*/
const getRandomInt = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

const api = (callback) => {
	setTimeout(() => {
		callback(Math.random() < 0.5);
	}, getRandomInt(10, 250));
};
/* ------------------------------- */

/** A function that converts */
async function pump() {
	var pos;
	while ((pos = buffer_str.indexOf('\n')) >= 0) { // for each line
		let line;
		if ((buffer_str[pos-1]) == ','){
			line = buffer_str.slice(0,pos-1); 		// remove ',' '\n'
			buffer_obj.push(JSON.parse(line));
		}
		else if ((buffer_str[pos-1]) == '}'){		// if it is last object
			line = buffer_str.slice(0,pos); 		// remove '\n'
			buffer_obj.push(JSON.parse(line));
		}
		buffer_str = buffer_str.slice(pos+1); 		// remove the line from our buffer
	}
}

/** A function that writes the output into a json file. */
function writeJSONOutput() {
	buffer_str = JSON.stringify(buffer_obj);
	var pos;
	var line;

	pos = buffer_str.indexOf('[');
	line = buffer_str.slice(0,pos+1);
	write_stream.write(util.format('%s\n',line));

	buffer_str = buffer_str.slice(pos+1);			// remove line from buffer

	while((pos = buffer_str.indexOf('}')) >= 0) {
		if (buffer_str[pos+1] == ',') {
			line = buffer_str.slice(0, pos+1);
			write_stream.write(util.format('\t%s,\n',line));
		}
		else {
			line = buffer_str.slice(0, pos+1);
			write_stream.write(util.format('\t%s\n]\n',line));
		}
		buffer_str = buffer_str.slice(pos+2);		// remove line from buffer
	}
}

/** Start recording time computation */
var before = process.hrtime();

pipeline(
	createReadStream(filename),
	async function * transform(source) {
		for await (let chunk of source) {
			buffer_str += chunk.toString();
			await pump();
		}

		let numapi = 0;
		buffer_obj.forEach(element => {
			api((status) => {
				numapi++;
				element["status"] = status;
				if (numapi == buffer_obj.length) {
					myAPIemitter.emit('event')
				}
			});
		});
	},
	(error) => {
		if (error) {
			console.log(error);
			return;
		}
		else {
			console.log('Pipeline succeeded!')
			myAPIemitter.on('event', function() {
				if (type == 'json') {
					writeJSONOutput();
				}
			});

			/** End time computation recording */
			var took = process.hrtime(before);
			console.log('Time Computation (ms): ' + took); 
		}
	}
);
