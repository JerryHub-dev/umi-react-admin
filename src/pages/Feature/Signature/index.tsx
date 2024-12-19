import { ProCard } from '@ant-design/pro-components';
import { useMount } from 'ahooks';
import { Button } from 'antd';
import SignaturePad from 'signature_pad';

import { SignatureStyle } from './Signature.styles';

export default function Signature() {
  useMount(() => {
    let canvas = document.getElementById('signature-pad') as HTMLCanvasElement;

    // Adjust canvas coordinate space taking into account pixel ratio,
    // to make it look crisp on mobile devices.
    // This also causes canvas to be cleared.
    function resizeCanvas() {
      // When zoomed out to less than 100%, for some very strange reason,
      // some browsers report devicePixelRatio as less than 1
      // and only part of the canvas is cleared then.
      let ratio = Math.max(window.devicePixelRatio || 1, 1);
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      canvas.getContext('2d')?.scale(ratio, ratio);
    }

    window.onresize = resizeCanvas;
    resizeCanvas();

    let signaturePad = new SignaturePad(canvas, {
      backgroundColor: 'rgb(255, 255, 255)', // necessary for saving image as JPEG; can be removed is only saving as PNG or SVG
    });

    let savePngButton = document.getElementById('save-png') as HTMLButtonElement;
    savePngButton.addEventListener('click', function () {
      if (signaturePad.isEmpty()) {
        return alert('请先提供签名.');
      }

      // let data = signaturePad.toDataURL('image/png');
      // console.log(data);
      // window.open(data);
      // 辅助函数
      function dataURLToBlob(dataURL: any) {
        const parts = dataURL.split(';base64,');
        const contentType = parts[0].split(':')[1];
        const raw = window.atob(parts[1]);
        const rawLength = raw.length;
        const uInt8Array = new Uint8Array(rawLength);

        for (let i = 0; i < rawLength; ++i) {
          uInt8Array[i] = raw.charCodeAt(i);
        }

        return new Blob([uInt8Array], { type: contentType });
      }
      const dataURL = signaturePad.toDataURL('image/png');
      const blob = dataURLToBlob(dataURL);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = 'signature.png';
      link.href = url;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    });

    // let saveJpegButton = document.getElementById('save-jpeg') as HTMLButtonElement;
    // saveJpegButton.addEventListener('click', function () {
    //   if (signaturePad.isEmpty()) {
    //     return alert('请先提供签名.');
    //   }

    //   let data = signaturePad.toDataURL('image/jpeg');
    //   console.log(data);
    //   window.open(data);
    // });

    // let saveSvgButton = document.getElementById('save-svg') as HTMLButtonElement;
    // saveSvgButton.addEventListener('click', function () {
    //   if (signaturePad.isEmpty()) {
    //     return alert('请先提供签名.');
    //   }

    //   let data = signaturePad.toDataURL('image/svg+xml');
    //   console.log(data);
    //   console.log(atob(data.split(',')[1]));
    //   window.open(data);
    // });

    let clear = document.getElementById('clear') as HTMLButtonElement;
    clear.addEventListener('click', function () {
      signaturePad.clear();
    });

    let draw = document.getElementById('draw') as HTMLButtonElement;
    draw.addEventListener('click', function () {
      signaturePad.compositeOperation = 'source-over'; // default value
    });

    let erase = document.getElementById('erase') as HTMLButtonElement;
    erase.addEventListener('click', function () {
      signaturePad.compositeOperation = 'destination-out';
    });

    let undo = document.getElementById('undo') as HTMLButtonElement;
    undo.addEventListener('click', function () {
      let data = signaturePad.toData();
      if (data) {
        data.pop(); // remove the last dot or line
        signaturePad.fromData(data);
      }
    });
  });

  return (
    <SignatureStyle>
      <ProCard className="h-full shadow-2xl">
        <div className="wrapper">
          <canvas
            id="signature-pad"
            className="signature-pad"
            // style={{ width: 400, height: 200 }}
          ></canvas>
        </div>

        <div className="flex justify-between max-w-3xl mt-8 min-w-96 mb-28">
          <Button id="save-png">保存为 PNG</Button>
          {/* <Button id="save-jpeg">保存为 JPEG</Button>
          <Button id="save-svg">保存为 SVG</Button> */}
          <Button id="draw">画</Button>
          <Button id="erase">擦除</Button>
          <Button id="undo">撤销</Button>
          <Button id="clear">清除</Button>
        </div>
      </ProCard>
    </SignatureStyle>
  );
}
