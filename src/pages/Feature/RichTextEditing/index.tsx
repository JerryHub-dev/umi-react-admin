import { ProCard } from '@ant-design/pro-components';
import { Editor } from '@tinymce/tinymce-react';
import { Button } from 'antd';
import { useRef } from 'react';

export default () => {
  const editorRef = useRef<any>(null);
  const log = () => {
    if (editorRef.current) {
      console.log(editorRef.current.getContent());
    }
  };
  return (
    <ProCard className="shadow-2xl">
      <Editor
        apiKey="6zvw3rhm02o1kafli7w6bclz6xt3zgc8fcc718dq44s56rz7"
        onInit={(evt, editor) => (editorRef.current = editor)}
        initialValue="<p>This is the initial content of the editor.</p>"
        init={{
          height: 500,
          menubar: false,
          plugins: [
            'advlist',
            'autolink',
            'lists',
            'link',
            'image',
            'charmap',
            'preview',
            'anchor',
            'searchreplace',
            'visualblocks',
            'code',
            'fullscreen',
            'insertdatetime',
            'media',
            'table',
            'code',
            'help',
            'wordcount',
          ],
          toolbar:
            'undo redo | blocks | ' +
            'bold italic forecolor | alignleft aligncenter ' +
            'alignright alignjustify | bullist numlist outdent indent | ' +
            'removeformat | help',
          content_style:
            'body { font-family:Helvetica,Arial,sans-serif; font-size:14px }',
        }}
      />
      <Button className="mt-8" onClick={log}>
        Log editor content
      </Button>
    </ProCard>
  );
};
