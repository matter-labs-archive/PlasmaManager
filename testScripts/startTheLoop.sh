#!/bin/sh
cd ..
node contracts/helpers/migrate.js
node eventMonitor.js &
node testScripts/blockAssemblyLoop.js
