export const TYPE_SELECTOR_OPTIONS = [
  { label: 'RSG', value: 'RSG' },
  { label: 'SSG', value: 'SSG' },
  { label: 'FSG', value: 'FSG' },
];

// value 是数据库使用的榜单版本；标签按速通类型显示。
export const VERSION_RANGE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  RSG: [
    { value: '1.7.10', label: 'Pre 1.8' },
    { value: '1.8.9', label: '1.8' },
    { value: '1.12.2', label: '1.9-1.12' },
    { value: '1.15.2', label: '1.13-1.15' },
    { value: '1.16.1', label: '1.16+' },
  ],
  SSG: [
    { value: '1.7.10', label: 'Pre 1.8' },
    { value: '1.8.9', label: '1.8' },
    { value: '1.12.2', label: '1.9-1.12' },
    { value: '1.15.2', label: '1.13-1.15' },
    { value: '1.16.1', label: '1.16-1.19' },
    { value: '1.20', label: '1.20+' },
  ],
  FSG: [{ value: '1.16.1', label: '1.16' }],
};
