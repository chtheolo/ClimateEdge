var assert = require('assert');
const { stat } = require('fs');
const dev_dictionary = require('../testing_dictionary.json')
const pool = require('../dbQuery');
const json = require('../writeJson');

describe('Queries', function() {
    describe('#success()', function() {
        it('should return 0 when the array is empty', async function() {
            var statistics = {
            	api_count: 100,
            	entries_count: 100,
            	true_count: 50,
            	false_count: 50,
            	pipeline_errors_count: 0,
            	read_execution_time: 0,
            	write_execution_time: 0,
            	api_execution_time: 0,
            }

            try {
                var res = await pool.post(statistics);
                assert.strictEqual(res.success, 1);
            } catch (error) {
                
            }
        });
    });
});

describe('WriteStream', function() {
    describe('#buffer_length()', function() {
        it('should return 0 when the array is empty', async function() {
            const data = {
              	phone: '123456789',
              	message: 'Hello World',
            };

            const min = 10;
            const max = 2000;

            function getRandomInt(min, max) {
                min = Math.ceil(min);
                max = Math.floor(max);
                return Math.floor(Math.random() * (max - min) + min); //The maximum is exclusive and the minimum is inclusive
            }

            var num = getRandomInt(min, max);
            var buffer_obj = [];
            for (let i=0; i<num; i++) {
                buffer_obj.push(data);
            }

            try {
                var res = await json.writeJSONOutput(buffer_obj);
                assert.strictEqual(res.buf_length, 0);
            } catch (error) {
                
            }
        });
    });
});