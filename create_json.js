var fs = require('fs');
var util = require('util');

var log_file = fs.createWriteStream('./dictionary.json');

var entries = process.argv[2];
if (entries === undefined) {
	entries = 250000;
}

const data = {
  	phone: '123456789',
  	message: 'Hello World',
};


function write(step) {
	if (step === entries-1){
		log_file.write(util.format("\t%j", data) + '\n');
		return;
	}
	log_file.write(util.format("\t%j,", data) + '\n');
}


function create_dataset(){
	log_file.write(util.format("[") + '\n');

	for (let i=0; i<entries; i++) {
		write(i);
	}

	log_file.write(util.format("]\n"));
}
var before = process.hrtime();
create_dataset();
var took = process.hrtime(before);
console.log('Create Dataset took: ' + took);
