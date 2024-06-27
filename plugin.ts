import { IApi } from '@umijs/max';

// document.ejs , 如何添加额外的标签: https://github.com/umijs/umi-next/issues/868
export default (api: IApi) => {
  api.modifyHTML(($) => {
    $('head').append([
      // 缩小的 turf 文件，并将其包含在脚本标记中
      '<script src="/public/js/turf.min.js" charset="utf-8"></script>',
    ]);
    return $;
  });
};
