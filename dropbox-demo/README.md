## Dropbox Demo 

This is a basic Dropbox clone to sync files across multiple remote folders.

Time spent: 2 hours

### Features

#### Required

- [x] Client can make GET requests to get file or directory contents
- [x] Client can make HEAD request to get just the GET headers 
- [x] Client can make PUT requests to create new directories and files with content
- [x] Client can make POST requests to update the contents of a file
- [x] Client can make DELETE requests to delete files and folders
- [x] Server will serve from `--dir` or cwd as root
- [x] Client will sync from server over TCP to cwd or CLI `dir` argument

### Optional

- [x] Client and User will be redirected from HTTP to HTTPS
- [x] Server will sync from client over TCP
- [x] Client will preserve a 'Conflict' file when pushed changes preceeding local edits
- [ ] Client can stream and scrub video files (e.g., on iOS)
- [ ] Client can download a directory as an archive
- [ ] Client can create a directory with an archive
- [ ] User can connect to the server using an FTP client

### Extra

- [x] Client can make GET requests to get file names under directory Recursively


### Walkthrough

![Video Walkthrough](...)
