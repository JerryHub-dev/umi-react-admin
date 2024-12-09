import { IApi } from '@umijs/max';

// document.ejs , 如何添加额外的标签: https://github.com/umijs/umi-next/issues/868
export default (api: IApi) => {
  api.modifyHTML(($) => {
    $('head').append([
      // 缩小的 turf 文件，并将其包含在脚本标记中
      `<script src="/public/js/turf.min.js" charset="utf-8"></script>`,
      // html2canvas 文件vs, 并将其包含在脚本标记中
      `<script src="/public/js/html2canvas.min.js" charset="utf-8"></script>`,
      // 添加 clarity 标签
      `<script type="text/javascript">
          (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "nkjea8mkrt");
      </script>`,
    ]);
    return $;
  });
};
