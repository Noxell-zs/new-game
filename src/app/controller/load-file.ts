const pickerOpts = {
  types: [
    {
      description: "Music",
      accept: {
        "audio/*": [],
      },
    },
  ],
  excludeAcceptAllOption: true,
  multiple: false,
} as const;

export async function getFile(): Promise<File | undefined> {
  if ('showOpenFilePicker' in window) {
    // @ts-ignore
    const [fileHandle] = await window.showOpenFilePicker(pickerOpts);
    return fileHandle.getFile();
  }
}
