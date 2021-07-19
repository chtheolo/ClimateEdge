const { createReadStream } = require('fs');
const { pipeline } = require('stream');
const EventEmitter = require('events');
const { exit } = require('process');
const pool = require('./dbQuery');
const json = require('./writeJson');
const log = require('./writeLog');

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
	read_execution_time: 0,
	write_execution_time: 0,
	api_execution_time: 0,
}

/** Create my own Event Emitter */
class MyEmitter extends EventEmitter {}
const myAPIemitter = new MyEmitter();

/** USER ARGUMENTS **/
const filename = process.argv[2];					// Get input file name
if (filename === undefined) {
	console.log('Try again!\nGive a dataset as input!\n\nHint Example:\n~$ node api_r_w.js dictionary.json');
	process.exit(-1);
}
else if (filename != undefined && filename.length >=0 && filename.endsWith('.json') == false) {
	console.log('Try again!\nGive a .json dataset as input!\n\nHint Example:\n~$ node api_r_w.js dictionary.json');
	process.exit(-1);
}

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

/** A function that reads chunks and splits them into lines 
 * 	and saves them in a buffer object. */
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

/** Start recording time computation */
var time_reference = process.hrtime();

pipeline(
	createReadStream(filename),
	async function * transform(source) {
		for await (let chunk of source) {
			buffer_str += chunk.toString();
			await pump();
		}
		
		// --> timestamp for Reading time
		statistics.read_execution_time = process.hrtime(time_reference)[1]/1000000;

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
					// --> timestamp for API calls time
					statistics.api_execution_time = process.hrtime(time_reference)[1]/1000000;
					myAPIemitter.emit('event');
				}
			});
		});
	},
	(error) => {
		if (error) {
			statistics.pipeline_errors_count++;
			log.writeLogOutput(error);
		}
		else {
			console.log('Pipeline succeeded!')
			myAPIemitter.on('event', async function() {
				buffer_str = JSON.stringify(buffer_obj);

				try {
					var res = await json.writeJSONOutput(buffer_obj);
					statistics.write_execution_time = res.time;

					buffer_obj = []; 								// empty the buffer
					log.writeLogOutput(statistics);					// Write the data in .log
					log.writeLogOutput(res.message);
					try{
						var db = await pool.post(statistics);		// Save data to DB
						log.writeLogOutput(db);
					}
					catch(error) {
						log.writeLogOutput(error);
					}
				} catch (error) {
					log.writeLogOutput(error);
				}
			});
		}
	}
);

module.exports = {
	pump: "pump",
	post: "post",
	writeJSON: "writeJSONOutput"
};
