

// Need SDK
// Use amazon s3 sdk
// then replace api url with akave s3 url

const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

const uploadFile = (fileName) => {
    const fileContent = fs.readFileSync(fileName);
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: 'uploads/' + path.basename(fileName),
        Body: fileContent
    };
    s3.upload(params, function(err, data) {
        if (err) {
            throw err;
        }
        console.log(`File uploaded successfully. ${data.Location}`);
    });
}

module.exports = {
    uploadFile
};

// upload file 

// read file