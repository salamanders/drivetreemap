# drivetreemap
Visualize your Google Drive used space using JavaScript, Google's Treemap widget, and Drive APIs


* https://drivetreemap.firebaseapp.com
* https://drive.google.com/corp/drive/quota


# NOTES

* https://firebase.google.com/docs/hosting/
* https://www.googleapis.com/auth/drive.metadata.readonly
* https://console.developers.google.com/apis/credentials?project=drivetreemap&folder&organizationId
* https://developers.google.com/chart/interactive/docs/gallery/treemap

# TODO / Scratch

## Batching

https://developers.google.com/api-client-library/javascript/features/batch

		const batch = gapi.client.newBatch();
		batch.add(gapi.client.drive.files.list(params), {"id": parentFolderId});
		  batch.then(responses => {
		    console.info(responses);
		    const resultFiles = [];
		    Object.entries(responses.result).forEach(([parentFolderId, response]) => {
		      response.result.files.forEach(file => {

## Page Tokens

		// "mimeType = 'application/vnd.google-apps.folder' OR mimeType contains 'video'"
		window.chainId = 0;
		window.batchId = 0;
		// Recursive (which isn't great) but handles token pagination
		const getAllFiles = (additionalQuery) => {
		  const thisChainId = window.chainId++;
		  const requestOptions = {
		      "pageSize": 1000,
		      //"orderBy": "quotaBytesUsed desc",
		      "fields": "nextPageToken, files(id, name, parents, size, mimeType)",
		      "q": "'me' in owners" + (additionalQuery ? ` AND (${additionalQuery})` : "") 
		    };
		  const recurseFiles = nextPageToken => new Promise(resolve => { 
		    const 
		      optionsWithToken = Object.assign({}, requestOptions, {"pageToken": nextPageToken}),
		      thisBatchId = window.batchId++;
		    console.info(`Requesting batch`, thisChainId, thisBatchId, optionsWithToken);
		    gapi.client.drive.files.list(optionsWithToken).then(response => {
		      response.result.files.forEach(file => console.debug(thisChainId, thisBatchId, file));
		      if(response.result.nextPageToken) {
		        console.info(thisChainId, thisBatchId, `Intermediate batch, continuing...`);
		        //resolve(response.result.files); // TEMP
		        recurseFiles(response.result.nextPageToken).then(nextFiles => {
		          console.info(thisChainId, thisBatchId, `Rolling back up!`);
		          resolve([...response.result.files, ...nextFiles]);
		        });
		      } else {
		        console.info(thisChainId, thisBatchId, `Last batch, bottoming out.`);
		        resolve(response.result.files);
		      }
		    });
		  });
		  return recurseFiles(null);
		};