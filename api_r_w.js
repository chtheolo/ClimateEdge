const { createReadStream , createWriteStream } = require('fs');
const { pipeline } = require('stream');
const util = require('util');
const EventEmitter = require('events');
const { Pool } = require('pg');
const dotenv = require('dotenv');
const { exit } = require('process');
dotenv.config();

/** POOL CONNECTION TO POSTGRESQL **/
const pool = new Pool({
//   user: process.env.USER,
  user: process.env.POSTGRES_USER,
  host: 'localhost',
  database: 'interviewdb',
  password: process.env.PASSWORD,
  port: process.env.PORT,
})

pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err) // your callback here
	writeLogOutput(err);
	process.exit(-1)
})

/** BUFFERS **/
var buffer_str= ''; 
var buffer_obj = [];

/** STATISTCS DATA Variables **/
var statistics = {
	api_count: 0,
	entries_count: 0,
	true_count: 0,
	false_count: 0,
	pipeline_errors_count: 0,
	Read_execution_time: 0,
	Write_execution_time: 0,
	Api_execution_time: 0,
}

/** Create my own Event Emitter */
class MyEmitter extends EventEmitter {}
const myAPIemitter = new MyEmitter();

/** USER ARGUMENTS **/
const filename = process.argv[2];					// Get input file name

/** Create WriteStream **/
const write_json_stream = createWriteStream('output.json');
const write_log_stream = createWriteStream('output.log', { flags: 'a' });

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
		else if ((buffer_str[pos-1]) == '}'){		// if it is the last entry
			line = buffer_str.slice(0,pos); 		// remove '\n'
			buffer_obj.push(JSON.parse(line));
		}
		buffer_str = buffer_str.slice(pos+1); 		// remove the line from our buffer
	}
}

function writeLogOutput(logs) {
	write_log_stream.write(util.format('%s\n',new Date().toUTCString()));
	write_log_stream.write(util.format('%s\n', logs));
}

function post(statistics) {
	pool.connect((error, client, release) => {
		if (error) {
			writeLogOutput(error);
		}
		else {
			let columns = ''
			let values = '';
			let i=1;
			let val_arr = [];
			let length = Object.keys(statistics).length;
			for (let key in statistics) {
				if (i == length) {
					columns = columns.concat(key);
					values = values.concat(`$${i}`);
				}
				else {
					columns  = columns.concat(key + ', ');
 		           values = values.concat(`$${i}, `);
				}
				val_arr.push(statistics[key]);
				i++;
			}

			client.query('INSERT INTO report(' + columns + ') VALUES (' + values + ')', val_arr, (error, results) => {
				release();
				if (error) {
					console.error(error);
					writeLogOutput(error);
				}
				else {
					console.log('Write query complete!');
					writeLogOutput('Write query complete');
				}
			});
		}
	});

}

/** A function that writes the output into a json file. */
function writeJSONOutput(writeLogOutput) {
	time_reference = process.hrtime();

	buffer_str = JSON.stringify(buffer_obj);
	var pos;
	var line;

	pos = buffer_str.indexOf('[');
	line = buffer_str.slice(0,pos+1);
	write_json_stream.write(util.format('%s\n',line));

	buffer_str = buffer_str.slice(pos+1);			// remove line from buffer

	while((pos = buffer_str.indexOf('}')) >= 0) {
		if (buffer_str[pos+1] == ',') {
			line = buffer_str.slice(0, pos+1);
			write_json_stream.write(util.format('\t%s,\n',line));
		}
		else {
			line = buffer_str.slice(0, pos+1);
			write_json_stream.write(util.format('\t%s\n]\n',line));
		}
		buffer_str = buffer_str.slice(pos+2);		// remove line from buffer
	}
	statistics.Write_execution_time = process.hrtime(time_reference)[1]/1000000;
	writeLogOutput(statistics);
	post(statistics);
}

/** Start recording time computation */
var time_reference = process.hrtime();

pipeline(
	createReadStream(filename),
	async function * transform(source) {
		for await (let chunk of source) {
			buffer_str += chunk.toString();
			await pump();
		}
		statistics.Read_execution_time = process.hrtime(time_reference)[1]/1000000;

		statistics.entries_count = buffer_obj.length;
		time_reference = process.hrtime();
		buffer_obj.forEach(element => {
			api((status) => {
				statistics.api_count++;
				element["status"] = status;
				switch (status) {
					case true:
						statistics.true_count++;
						break;
				
					case false:
						statistics.false_count++;
						break;
				}
				if (statistics.api_count == statistics.entries_count) {
					statistics.Api_execution_time = process.hrtime(time_reference)[1]/1000000;
					buffer_obj = []; 				// empty our buffer
					myAPIemitter.emit('event');
				}
			});
		});
	},
	(error) => {
		if (error) {
			statistics.pipeline_errors_count++;
			writeLogOutput(error);
		}
		else {
			console.log('Pipeline succeeded!')
			myAPIemitter.on('event', function() {
				writeJSONOutput(writeLogOutput);
			});
		}
	}
);
