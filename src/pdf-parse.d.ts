// src/types/pdf-parse.d.ts
declare module 'pdf-parse' {
    interface PDFData {
      numpages: number;
      numrender: number;
      info: any;
      metadata: any;
      text: string;
      version: string;
    }
  
    function PDFParse(dataBuffer: Buffer, options?: any): Promise<PDFData>;
    export default PDFParse;
  }