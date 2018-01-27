#! /bin/bash

# Ubuntu require sudo and user to do psql in shell
sudo -u postgres dropdb testslack
sudo -u postgres createdb testslack

# Put the dump-file into testslack database, if want to start w/ seed data
#psql testslack < dump.sql