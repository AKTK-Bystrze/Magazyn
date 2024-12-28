#create and populate db. Can get current one from a server using admin's /db/backup endpoint
sqlite3 magazyn_prod.db < db.schema
sqlite3 magazyn_prod.db ".read boxTest/db_test.data" 