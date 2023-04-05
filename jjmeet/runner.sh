#!/bin/bash
peerjs --port $peer_port --path $peer_path &
P1=$!
npm run prod &
P2=$!
wait $P1 $P2
