interface FileActionParams {
  action: 'save' | 'move' | 'copy' | 'meta' | 'delete' | 'one' | 'list';
  path?: string;
  target?: string;
}

export default FileActionParams;
