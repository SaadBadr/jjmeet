#!/bin/bash
peerjs -p 3001 &
P1=$!
npm run prod &
P2=$!
wait $P1 $P2
