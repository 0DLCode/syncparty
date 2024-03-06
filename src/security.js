const path = require('path');
const fs = require("fs");
const moment = require('moment');
const {globalWarns, warnLimit} = require('./globals.js');
require('dotenv').config();

const logPath = path.join(__dirname, "..", process.env.LOG_PATH || "./a_d/log.txt");
const checkPath = process.env.CHECK_PATH || "./a_d/check.txt";
const blackListPath = process.env.BLACK_LIST_PATH || "./a_d/blackList.json";
let blackList = [];

function writeLog(req) {
  let ip=req.ip.replace('::ffff:', '');
  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, '');
  }
  fs.appendFile(logPath, `${moment().format('YYYY-MM-DD HH:mm:ss')} [${ip}] => ${req.method} ${req.url}\n`.toString(), (err) => {
    if (err) {
      console.error('Error while logging', err);
      return;
    } else {
      if (req.body) {
        fs.appendFile(logPath, `==> ${JSON.stringify(req.body)}\n`, (err) => {
          if (err) {
            console.error('Error while logging', err);
            return;
          }
        });
      }
    }
  });
  if (!fs.existsSync(checkPath)) {
    fs.writeFileSync(checkPath, '[]');
  }
  let fileIps = JSON.parse(fs.readFileSync(checkPath, 'utf8')) || [];
  if (!fileIps.includes(ip)) {
    fileIps.push(ip);
    fs.writeFileSync(checkPath, JSON.stringify(fileIps), (err) => {
      if (err) {
        console.error('Error while writing ip', err);
        return;
      }
    })
  }
}

function black_list(ip) {
  let ip_=ip.replace('::ffff:', '');
  if (!fs.existsSync(blackListPath)) {
    fs.writeFileSync(blackListPath, '[]');
  }
  let fileIps = JSON.parse(fs.readFileSync(blackListPath, 'utf8')) || [];
  if (!fileIps.includes(ip_)) {
    fileIps.push(ip_);
    fs.writeFileSync(blackListPath, JSON.stringify(fileIps), (err) => {
      if (err) {
        console.error('Error while writing ip', err);
        return;
      }
    })
  }
}

function warnClient(ip) {
  if (globalWarns.hasOwnProperty(ip)) {
    globalWarns[ip] += 1;
  } else {
    globalWarns[ip] = 1;
  }
  if (globalWarns[ip] >= warnLimit) {
    black_list(ip);
  }
}

function checkWarn(ip) {
  if (globalWarns.hasOwnProperty(ip) && globalWarns[ip] >= warnLimit) {
    return false
  } else {
    return true
  }
}

module.exports = { black_list, writeLog, warnClient, checkWarn };