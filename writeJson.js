const log = require('./writeLog');
const pool = require('./dbQuery');
const util = require('util');
const { createWriteStream } = require('fs');

const write_json_stream = createWriteStream('output.json');

/** A function that writes the output into a json file. */
exports.writeJSONOutput = async function(buffer_obj) {
	return new Promise((resolve, reject) => {
		var time_reference = process.hrtime();
		var buffer_str = '';

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

				buffer_str = buffer_str.slice(pos+2);		// remove line from buffer
			}
			else {
				line = buffer_str.slice(0, pos+1);
				write_json_stream.write(util.format('\t%s\n]\n',line));
				// --> timestamp for Writing time
				// statistics.write_execution_time = process.hrtime(time_reference)[1]/1000000;
				var write_execution_time = process.hrtime(time_reference)[1]/1000000;

				buffer_str = buffer_str.slice(pos+2);		// remove line from buffer
				resolve({
					message:'Create new updated dictionary.json',
					buf_length: buffer_str.length,
					time: write_execution_time
				});
			}
		}

		write_json_stream.on('error', (error) => {
			reject(error);
		})
	})
}