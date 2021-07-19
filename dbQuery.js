const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

/** POOL CONNECTION TO POSTGRESQL **/
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: 'localhost',
  database: 'interviewdb',
  password: process.env.PASSWORD,
  port: process.env.PORT,
})

pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err)
	writeLogOutput(err);
	process.exit(-1)
})

/** This function is responsible to create a thread pool 
 * 	and save our data to our postgresql DB. */
exports.post = async function (statistics) {
	return new Promise((resolve, reject) => {
		pool.connect((error, client, release) => {
			if (error) {
				reject(error);
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
						// console.error(error);
						// writeLogOutput(error);
						reject(error);
						// throw error;
					}
					else {
						// writeLogOutput('Insert query sucessfully saved to DB!');
						resolve({
							message: 'Insert query sucessfully saved to DB!',
							success: 1
						});
					}
				});
			}
		});
	})
}