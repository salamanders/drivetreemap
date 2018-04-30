/*globals login, google, gapi */
/*jshint esversion: 6 */
/*jshint unused:true */

const
  API_KEY = "AIzaSyCMSEMGa6cyEsXw4KhBCuLSNPs8TF6wYXo",
  CLIENT_ID = "821349519499-v08t487pt8643js1mpe07t5ojalit1ti.apps.googleusercontent.com",
  APIS = [
    {
      "gapi": "drive",
      "discovery": "https://www.googleapis.com/discovery/v1/apis/drive/v3/rest",
      "scopes": ["https://www.googleapis.com/auth/drive.metadata.readonly"]
    },
    { "chart": "treemap" }
  ];

Array.prototype.unique = function() {
  return this.filter((elem, pos, arr) => {
    return arr.indexOf(elem) == pos;
  });
};


/** 
 * Gather all files to a depth limit, in parallel.  
 * Easier to do successive callbacks than wait on a Promise.
 */
const fileWalk = (fileConsumer, parentFolderIds = ['root'], depth = 0, maxDepth = 3) => {
  console.debug('fileWalk', parentFolderIds, depth, maxDepth);
  if(depth > maxDepth) {
    console.debug(`Reached max depth`);
    return;
  }
  const parentStr = parentFolderIds.map(pfid=>`'${pfid}' in parents`).join(' OR ');
  const params = {
    "pageSize": 1000,
    "orderBy": "quotaBytesUsed desc",
    "fields": "nextPageToken, files(id, name, parents, size, mimeType)",
    "q": `'me' in owners AND trashed != true AND (${parentStr})`
  };
  console.info('Params', params);
  gapi.client.drive.files.list(params).then(response => {
    fileConsumer(response.result.files);    
    const childFolderIds = response.result.files
      .filter(file=>file.mimeType=="application/vnd.google-apps.folder")
      .map(folder=>folder.id);
    if(childFolderIds.length>0)
    fileWalk(fileConsumer, childFolderIds, depth+1, maxDepth);
  });
};

login(API_KEY, CLIENT_ID, APIS).then(() => {
  console.info(`Login finished, starting app init.`);

  const 
    allFiles = [],
    dt = new google.visualization.DataTable({
      cols: [{id: 'fileName', label: 'File Name', type: 'string'},
             {id: 'parent', label: 'Parent', type: 'string'},
             {id: 'bytes', label: 'Size', type: 'number'},
             {id: 'type', label: 'Type', type: 'number'}]}),
    tree = new google.visualization.TreeMap(document.getElementById("map"));
  let rootId = null;
  const fileConsumer = files => {
    // Data cleaning
    files.forEach(file=>{
      file.parent = file.parents.sort()[0];
      allFiles.push(file);
    });
    console.info(`Full list:${allFiles.length}`);
    // nice side-effect of ordering making closer colors
    const allMimeTypes = allFiles.map(file => file.mimeType).sort().unique();
    const fileIdToName = allFiles.reduce((map, obj) => {
        map[obj.id] = obj.name;
        return map;
    }, {});

    // First time find the root
    if(!rootId) {
      const firstWithNoParent = allFiles.find(elt=>!fileIdToName.hasOwnProperty(elt.parent));
      rootId = firstWithNoParent.parent;
      fileIdToName[rootId] = 'root';
      console.info('Found root', rootId, fileIdToName[rootId]);
      dt.addRow([`root (${rootId})`, null, 0, 0]);
    }

    files.forEach(file => {
      dt.addRow([
        `${file.name} (${file.id})`, 
        `${fileIdToName[file.parent]} (${file.parent})`,
        file.size ? parseInt(file.size, 10) : 0, 
        allMimeTypes.indexOf(file.mimeType) 
      ]);
    });
    //console.info("dt", dt.toJSON());
    tree.draw(dt, {
      maxDepth: 3,
      maxPostDepth: 8,
      minColor: '#009688',
      midColor: '#f7f7f7',
      maxColor: '#ee8100',
    });
  };

  fileWalk(fileConsumer);

}).catch(error => {
  console.error(error);
});