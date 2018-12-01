var request = require('request-promise');
var azure  =  require('azure-storage');

module.exports = function (context, myBlob) {

context.log("Analyzing uploaded image '" + context.bindingData.name + "' for adult content...");
var options = getAnalysisOptions(myBlob, process.env.SubscriptionKey, process.env.FaceEndpoint);
analyzeAndProcessImage(context, options);

function getAnalysisOptions(image, subscriptionKey, endpoint) {
    // Request parameters.
    var params = {
        "returnFaceId": "true",
        "returnFaceLandmarks": "false",
        "returnFaceAttributes":
            "emotion"
    };
    
    return  {
        uri:endpoint + "/detect?" + $.param(params),
        method: 'POST',
        body: image,
        headers: {
            'Content-Type': 'application/octet-stream',
            'Ocp-Apim-Subscription-Key': subscriptionKey
        }
    }
};

function analyzeAndProcessImage(context, options) {
    request(options)
    .then((response) => {

        response = JSON.parse(response);

        context.log(response);

        //context.log("Is Adult: ", response.adult.isAdultContent);
        //context.log("Adult Score: ", response.adult.adultScore);
        //context.log("Is Racy: " + response.adult.isRacyContent);
        //context.log("Racy Score: " + response.adult.racyScore);

        var fileName = context.bindingData.name;
        var targetContainer = 'processed';
        var blobService = azure.createBlobService(process.env.AzureWebJobsStorage);

        blobService.startCopyBlob(getStoragePath("uploaded", fileName), targetContainer, fileName, function (error, s, r) {
                        
            if(error) context.log(error);
            context.log(fileName + " created in " + targetContainer + ".");

            blobService.setBlobMetadata(targetContainer, fileName, 
            {
                //"isAdultContent" : response.adult.isAdultContent,
                //"adultScore" : (response.adult.adultScore * 100).toFixed(0) + "%",
                //"isRacyContent" : response.adult.isRacyContent,
                //"racyScore" : (response.adult.racyScore * 100).toFixed(0) + "%"
                data : response
            }, 

            function(error,s,r) {
                 if(error) context.log(error);
                 context.log(fileName + " metadata added successfully.");
            });
        });
    })
    .catch((error) => context.log(error))
    .finally(() => context.done());
};

function getStoragePath(container,fileName) {
    var storageConnection = (process.env.WEBSITE_CONTENTAZUREFILECONNECTIONSTRING).split(';');
    var accountName = storageConnection[1].split('=')[1];
    return "https://" + accountName + ".blob.core.windows.net/" + container + "/" + fileName + ".jpg";
};
};