const sceleton = require('./sceleton-concurrent');
const jsonfile = require('jsonfile');
// non transactional Models
const Event_nontx = require('../test-system/EventApi/models/Event');
const Job_nontx = require('../test-system/JobApi/models/Job');
// transactional Models
const Event_tx = require('../test-system-transactional/EventApi/models/Event');
const Job_tx = require('../test-system-transactional/JobApi/models/Job');
// transactional Wrappers
const app_nonTx = require('../test-system/WrapperApi/index');
//const app_tx_cfs = require('../test-system-transactional/WrapperApi/index');
//const app_tx_locking = require('../test-system-transactional/WrapperApi/index_txLock');
const app_tx_checker = require('../test-system-transactional/WrapperApi/index_txChecker');


function clearUpNonTxDatabases() {
  let promises = [];
  promises.push(Event_nontx.deleteAll());
  promises.push(Job_nontx.deleteAll());
  return Promise.all(promises);
}

function clearUpTxDatabases() {
  let promises = [];
  promises.push(Event_tx.deleteAll());
  promises.push(Job_tx.deleteAll());
  return Promise.all(promises);
}

function saveResults(data, name) {
  return new Promise((resolve, reject) => {
    jsonfile.writeFile(`./data/data_${name}.json`, data, {spaces: 2}, function(err) {
      if(err) {
        console.error('Error writing performance file.', err);
      }
      resolve();
    });
  });
}

function runSpecs(type, times, name, results) {
  function run(type, num) {
    return sceleton(type, `${name}_${num}`);
  }
  if (times > 0) {
    return run(type, times)
      .then(res => {
        results.push(res);
        return runSpecs(type, times-1, name, results);
      });
  } else {
    const arr = [];
    let len = results.length;
    results.forEach((x, idx1) => {
      x.forEach((obj, idx) => {
        if (idx1 === 0) {
          arr.push({});
        }
        arr[idx].n = arr[idx].n ? arr[idx].n : obj.n;
        arr[idx].time = arr[idx].time ? arr[idx].time + obj.time : obj.time;
        arr[idx].avg = arr[idx].avg ? arr[idx].avg + obj.avg : obj.avg;
        arr[idx].success = arr[idx].success ? arr[idx].success + obj.success : obj.success;
        arr[idx].successRate = arr[idx].successRate ? arr[idx].successRate + obj.successRate : obj.successRate;
      });
    });
    const merged = arr.map(x => {
      for (prop in x) {
        if (prop !== 'n') {
          x[prop] = x[prop] / len;
        }
      }
      return x;
    });
    saveResults()
    return Promise.resolve(merged);
  }
}

//clearUpTxDatabases();
runSpecs(app_tx_checker, 1, 'tx_checker', [])
  .then(res => saveResults(res, 'tx_checker'));

// sceleton(app_transactional_locking)
//   .then(() => {
//     console.log('finished running performance tests for the transactional system with Locking');
//   });

// sceleton(app_transactional_checker)
//   .then(() => {
//     console.log('finished running performance tests for the transactional system with Tx Checker');
//   });
