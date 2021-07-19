# ClimateEdge
This project is developed in Nodejs/Javascript for the purpose of the interview. The main functionality is to read large json datasets in an efficient way, manilpulate the data and output a new json dictionary and an output.log that has all the information about the process.
Also the program stores the necessary data in postgresql with a pre-designed schema and a dbhandle.sql file is located with basic queries.

## Contents
* [How to install](#how-to-install)
* [How to run](#how-to-run)
* [Architecture](#arch)
* [Future Work](#future)

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

So you can run the create_json.js by typing :

```npm
node create_json.js
```

The file will generate a *dictionary.json* with a 250K entries. You can generate a *dictionary.json* with the number of entries you wish by just giving an argument number like this:

```npm
node create_json.js 100
```
So, now the file will generate a *dictionary.json* with 100 entries.

Then you can start the program by typing inside the project's directory:

```npm
node api_r_w.js dictionary.json
```

<a name="arch"></a>
## Architecture

The api is divided in 4 logical parts.
1. Read from dataset.
2. Manipulate the dataset.
3. Write the updated dataset and a log file.
4. Store data to postgresql.

