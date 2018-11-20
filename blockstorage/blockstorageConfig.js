// uploaded = available on azure blob storage
// submitted = block header posted to the plasma parent contract

const env = process.env;

// don't load .env file in prod
if (env.NODE_ENV !== 'production') {
    require('dotenv').load();
}

module.exports = {
    connectionString: env.STORAGE_CONNECTION_STRING,
    storageBucket: env.STORAGE_BUCKET || "stage",
    localStorageDirName: env.LOCAL_STORAGE_DIR
};