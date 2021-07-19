const { createWriteStream } = require('fs');
const util = require('util');

const write_log_stream = createWriteStream('output.log', { flags: 'a' });

/** This function writes our logs into out output log file. */
exports.writeLogOutput = function(logs) {
	write_log_stream.write(util.format('%s\n',new Date().toUTCString()));
	write_log_stream.write(util.format('%s\n', logs));

    write_log_stream.on("error", (error) => {
        console.log(error);
    });
}