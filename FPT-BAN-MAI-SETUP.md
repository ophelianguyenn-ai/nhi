# Cấu hình giọng đọc: FPT Ban Mai + Microsoft InJoon

**Giọng đã chọn**: tiếng Việt = FPT.AI Ban Mai (voice: banmai); tiếng Hàn = Microsoft Neural InJoon (ko-KR-InJoonNeural).

Website chỉ tải MP3 tĩnh. FPT API key không bao giờ được đưa lên GitHub Pages hoặc vào JavaScript công khai.

## Cần có FPT_API_KEY

1. Vào https://console.fpt.ai/, đăng ký/đăng nhập.
2. Kích hoạt dịch vụ **Text to Speech**, tạo project và API key.
3. Vào repo GitHub → Settings → Secrets and variables → Actions → New repository secret.
4. Tên: **FPT_API_KEY**. Giá trị: API key của bạn. Không đưa key vào commit, tin nhắn hoặc các file công khai.

Hướng dẫn chính thức: https://docs.fpt.ai/docs/vi/speech/api/text-to-speech/.

## Chuyển giọng đọc từng đợt

Actions → **Prepare FPT Ban Mai and Korean InJoon audio batches** → Run workflow.

Mặc định: scope=daily, language=both, offset=0, limit=30, dry_run=true. Đây chỉ là bản xem trước, không gọi dịch vụ hoặc tính phí.

Sau khi thêm FPT_API_KEY, chuyển dry_run=false và chạy thử một đợt nhỏ (ví dụ limit=10). Đánh giá âm thanh trên web trước khi chuyển lượng lớn.

- scope=daily: 149 cặp câu trong bài học ngày đang chọn.
- scope=all: tất cả câu có trong lessons.json và thẻ cổ điển tại index.html.
- language=vi: chỉ FPT Ban Mai (cần khóa).
- language=ko: chỉ InJoon (không cần FPT key).
- offset và limit: chạy theo từng đợt; limit=0 nghĩa là không giới hạn, có thể gọi FPT hàng nghìn lần.

Mỗi câu chỉ chuyển sang giọng mới sau khi tải xuống và xác thực MP3. MP3 Hoài My/SunHi cũ không bị ghi đè, những câu chưa chuyển vẫn phát file trước đó. File audio-manifest.json ghi kèm provider và voice của file mới. Các workflow đời cũ cũng đã chuyển sang cùng bộ tạo giọng, tránh vô tình sinh thêm Hoài My/SunHi.

Kiểm tra không cần API: python -m unittest scripts/test_selected_voices.py -v
