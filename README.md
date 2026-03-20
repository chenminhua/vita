# vita

我的健身记录和健康信息仓库。

## 文件结构

- `YYYY.md`：每年训练记录（Markdown 表格，三列：Date / Workout / Duration）
- `health_status.md`：健康状态记录（最新在最上面）
- `docs/`：GitHub Pages 页面（训练热力图 + 年度汇总）

## 记录规则

### Workout Recording

- 每次训练按行追加到当年文件（如 `2026.md`）
- 日期格式：`MM-DD`
- 时长格式：
  - `30 分钟` → `30min`
  - `3 小时` → `3h`

示例：

| Date  | Workout | Duration |
| ----- | ------- | -------- |
| 03-20 | 腿      | 30min    |
| 03-20 | 胸      | 30min    |

### Health Status

追加到 `health_status.md` 顶部：

```text
## 2026-03-20
体重 73.5 kg
```

## GitHub Pages

Pages 使用 `docs/` 目录。

- 默认定位到今年
- 支持切换年份（自动读取仓库中的 `YYYY.md`）
- 展示全年每日运动热力图（颜色越深表示当天总时长越长）
- 展示年度汇总（按 Workout 聚合 + 年总时长）

> 若新年开始没有对应 `YYYY.md`，先新建该年份文件再记录。
