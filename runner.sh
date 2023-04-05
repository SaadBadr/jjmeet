#!/bin/bash
peerjs --port 3001 --path /mypeerserver &
P1=$!
npm run prod &
P2=$!
wait $P1 $P2
