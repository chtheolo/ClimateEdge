# ClimateEdge
This project is developed in Nodejs/Javascript for the purpose of the interview. The main functionality is to read large json datasets in an efficient way, manilpulate the data and output a new json dictionary and an output.log that has all the information about the process.
Also the program stores the necessary data in postgresql with a pre-designed schema and a dbhandle.sql file is located with basic queries.

## Contents
* [How to install](#how-to-install)
* [How to run](#how-to-run)
* [Architecture](#arch)
* [Future Work](#future)
* [Questions](#questions)

<a name="how-to-install"></a>
## How to install
The first thing is to install all the necessary dependencies. Type:
```npm
sudo npm install
```

This project was built to communicate with the [**postgresql**](https://www.postgresql.org/) database. So you can follow the instructions [**here**](https://www.postgresql.org/download/) in order to download and install the postgresql in your system.

<a name="how-to-run"></a>
## How to run

Before start running the program, you should be sure that postgresql service is up and running by typing:

```npm
sudo service postgresql status
```

If you see a message like the above
```npm
12/main (port 5432): down
```

it means that the postgresql service is in-active. So start the service by typing:

```npm
sudo service postgresql start
```

The program needs a json dataset as input. For that reason, you can run the create_json.js file which generates a json dataset in the form of :

```json
[
	{"phone":"123456789","message":"Hello World"},
	{"phone":"123456789","message":"Hello World"},
    .
    .
    .
	{"phone":"123456789","message":"Hello World"}
]
```

So you can run the create_JSONdataset.js by typing :

```npm
node create_JSONdataset.js
```

The file will generate a *dictionary.json* with a 250K entries. You can generate a *dictionary.json* with the number of entries you wish by just giving an argument number like this:

```npm
node create_JSONdataset.js 100
```
So, now the file will generate a *dictionary.json* with 100 entries.
Moreover, you have to run the *.sql* file once as it is assumed that the developed API is not responsible for creating database schemas. It is assumed that another API will generate the schemas which may be developed from another group team.

Run the following command:

```npm
sudo -u postgres psql -f dbhandle.sql
```

Then you can start the program by typing inside the project's directory:

```npm
node api_JsonDataset.js dictionary.json
OR
npm start dictionary.json
```

<a name="arch"></a>
## Architecture

This project is divided in 4 logical parts.
1. Read from JSON dataset and manipulate the data before writing them again in new dataset. The file *api_JSONdataset.js* is responsible for this operation.
2. Create a new updated dataset with the *writeJson.js*.
3. Store data analytics in our postgresql data with the *dbQuery.js*
4. *writeLog.js* is reponsible for logging information for every process in an output.log file.

### api_JSONdataset.js
The main file is the *api_JSONdataset.js* from where we call all the external modules.
This files in order to run needs as input argument a json dataset. 
So, it begins a pipeline operation in which it creates a read stream and reads the input dataset chunk by chunk, as we see in the next line code.

```javascript
pipeline(
	createReadStream(filename),
	async function * transform(source) {
		for await (let chunk of source) {
			buffer_str += chunk.toString();
			await pump();
		}
```
The reason we do the read in chunk partitions is because we do not want to read a huge file in once. This would be very bad for our memory. For every chunk we call the **pump()** funtion which decodes the chunks into lines and saves them in an buffer object array. 

```javascript
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
```
The while-loop when ever finds a '\n', it assums that all the string before that is an line object. After reading and saving a line object into our buffer_obj, we remove that line from our buffer_str until he has no more data.

After the reading process reach the end, we call the **api** function for each element of our buffer_obj. The **api** returns a callback function with a result of **true** or **false**.
So, we create a new property for each object with proeprty name *status* equals with the returned value.


```javascript
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
    
```
When we reach the last entry, we emit an event which inform us that all callback functions have returned from the stack, and as a result we have every entry of the buffer_obj updated with the status property.

If no errors occured in the process, we listen to that event and we call the module that is resposible for building the new updated json dataset.

```javascript
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
```

This module takes as argument our buffer_obj and returns if we have no errors a json response with a message that inform us that the operation completed sucessfully, a number that tells us that we have no more data into our buffer and finally the write execution time.
```json
{
  "message": "Create new updated dictionary.json",
  "buf_length": 0,
  "time": 313.8605
}
```
In the case of everything gone well, we are ready to save our statistics into our postgresql.
The statistics is declared as an objec variable with the form as we see below:

```javascript

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
```

During the whole process, we keep data of the workflow. 
* **api_count :** is a property that keeps how many calls of the inner api method occured. 
* **entries_count :** keeps how many entries has the input dataset.
* **true_count :** stores how many true values returned from the api callback function.
* **false_count :** stores the number of the false values returned from the api callback function.
* **pipeline_errors_count :** keeps the number of errors in the pipeline.
* **read_execution_time :** depicts the elapsed time for the read input dataset operation.(ms)
* **write_execution_time :** depicts the elapsed time for building the new json dataset.(ms)
* **api_execution_time :** stores the time duration for the inner api execution.(ms)

So, after the succesful creation of the new json dataset, we call the following function

```javascript
var db = await pool.post(statistics);		// Save data to DB
```

This function belongs to the *dbQuery.js* module and is responsible to store our data to our postgresql.
First of all, we create a pool connection with the database in order to have the ability to create different thread-clients for our database.

```javascript
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
```

Worth to mention that in the above code sample, we read from our local .env file critical information like the user of the postgres, the user's password and the port in which the 
database is running.
Suggest to make your own .env file inside the project's directory with your own parameters.

```javascript
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
						reject(error);
					}
					else {
						resolve({
							message: 'Insert query sucessfully saved to DB!',
							success: 1
						});
					}
				});
			}
		});
	})
```

So, when we call the **pool.post(statistcs)**, we pass the json object we want to save and we create a thread-client from our pool in order to execute our query.
We build our query dynamically, by create the **columns** and **values** strings every time we call the function accrodingly to the statistics properties.

Finally, for every *api_JSONdataset.js* execution, we write logs into our *output.log* file without removing the history. In the *output.log* file we keep every function's output and errors that may be occured during the process. 

```javascript
const write_log_stream = createWriteStream('output.log', { flags: 'a' });

/** This function writes our logs into out output log file. */
exports.writeLogOutput = function(logs) {
	write_log_stream.write(util.format('%s\n',new Date().toUTCString()));
	write_log_stream.write(util.format('%s\n', logs));

    write_log_stream.on("error", (error) => {
        console.log(error);
    });
}
```


As we see in the above line code, every log has the exact UTC time for eachmessage.
The function *writeLogOutput()* from the module *writelog.js* is responsible to write and update our *output.log* file.


*We assume that another api is responsible for the database schema. As a result, we do not create the schema database in our api_JSONdataset.js as we believe that this api only writes data to pre-defined schema.* 

<a name="future"></a>
## Future Work

In the conlusion, I would like to mention some extra work that I believe that it would be necessary to do.

### Containers
One of the most import features of the nowdays development is to make containarizing applications for various of reasons like:

* Agile application creation and deployment: increased ease and efficiency of container image creation compared to VM image use.
* Continuous development, integration, and deployment
* Environmental consistency across development, testing, and production: Runs the same on a laptop as it does in the cloud.
* Loosely coupled, distributed, elastic, liberated micro-services: applications are broken into smaller, independent pieces and can be deployed and managed dynamically – not a monolithic stack running on one big single-purpose machine.

### ORM
(ORM) is a technique that lets you query and manipulate data from a database using an object-oriented paradigm.
* You write your data model in only one place, and it's easier to update, maintain, and reuse the code.
* It forces you to write MVC code, which, in the end, makes your code a little cleaner.
* Less code compared to embedded SQL and handwritten stored procedures

### Error Handling
In this project most of the cases I grub the error and just save it in our *output.log* file in order to read and understand where the is the bug on the code.
I  the future I would like to handle these errors and make code decisions accordinly to them.

### More Unit Testing
For the given time I wrote some simple unit tests. I would like to write more tests in the future in order to have a better perception of how the code behaves in different states and improve its functionality.

<a name="questions"></a>
## Questions

* *How would you explain APIs to non-technical stakeholders?*

Firstly, I would try a non-technical approach by giving a real-life example, e.g. when you want to calculate an addition in maths with some given numbers, you 
have to do the whole addition on your own in order to find the solution.
So, the API is an automate process, in which you can give a certain inputs, like the numbers of the addition in the above example, calculate and return the result
to you.

* *How would you review your peers' commits?*

    - I would suggest my peers to do meaningful commits and commit early and often. It's far 
    to run multiple small reviews than a single huge one.
    - Encouraging developers to produce well-documented code before review is issued
    - Committing code to a 'test' or "develop' branch first and pushing it to the main one after it successfully passes the review
    - Code structure with the company's team structure. (There are tools that also do that in CI/CD)

* *What was the most satisfying challenge you have completed and why?*

One of the most satisfying challenge I have completed was a course in my MSc in which I have developed from the top a Wireless Protocol for wireless sensors in TelosB motes. This was a big challenge for me, as the course was for teams of 2 people but unfortunately the number of students was odd so I took the decision to go alone. 
We had to implement all the backoff of the network, the routing tables, the buffering, the changing node topology in the network, the packet loss, sending new firmaware to nodes and energy efficiency.
Finally, after fully focusing, many hours of studying, developing, testing and asking a lot of questions I managed to develop a very good solution that work standalone in TelosB motes.

* *What was the most satisfying challenge you have completed and why?*

Using TDD in your project helps you to write small and simple parts of code, so it is modular, 
you don't mess with a lot of features but only focusing on one. It is also, easy to maitain as your code 
is being written in different parts and interfaces. This follows with an easier to refactor. Nevertheless, all these pros that TDD comes to, it comes also with some negative things. Developing with TDD is extra slow process as you have to decide the interfaces, write tests and finally start writing code. Moreover, the engineer must have a great perception of the whole project in order to start contribute to the team. It's difficult because all members of the team have to do it. So, in my opinion TDD is good but a utopian approach and I believe that more unit testing is a better, easier and faster way to develop something.

* *What should be the different columns/steps on a Jira board?*

Ideas | ToDo | onProgress | Testing | Done | Bugs

* *Spaces or Tabs?*

The advantages of tabs over spaces are that individual developers can choose differing indents for their code and they also use less storage space.
However, tabs have problems too. Tabs interact poorly with the maximum columns width, as a tab could be a different number of columns depending on your environment, but a space is always one column.