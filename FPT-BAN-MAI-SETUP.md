# Giọng đọc Nhi's Learning Corner: FPT Marketplace Ban Mai + Microsoft InJoon

**Giọng Việt:** Ban Mai nữ miền Bắc qua FPT Marketplace, model FPT.TTS-pro, voice std_banmai.  
**Giọng Hàn:** InJoon qua Microsoft Neural, ko-KR-InJoonNeural.

## Vì sao không dùng FPT.AI Console cũ nữa?

FPT.AI ngừng bán mới dịch vụ Console cho khách hàng cá nhân từ **06/07/2026**, và dừng các gói cá nhân cũ từ **29/08/2026**.
Thông báo: https://fpt.ai/vi/tin-tuc/thong-bao-quan-trong-ve-viec-ngung-cung-cap-dich-vu-ca-nhan-tren-fpt-ai-console/

Khóa lấy từ console.fpt.ai KHÔNG dùng thay thế cho API key Marketplace mới.
Không tiếp tục sửa secret FPT_API_KEY cũ.

## Bước duy nhất cần thực hiện trên tài khoản Marketplace

1. Đăng ký/đăng nhập https://marketplace.fptcloud.com/en/models/fpt-tts-pro
2. Chọn Get API & Start Using (hoặc Try in Playground) và kiểm tra tài khoản có quyền dùng FPT.TTS-pro, giọng std_banmai; xem điều kiện/chi phí trước khi tạo.
3. Mở https://marketplace.fptcloud.com/en/my-account#my-api-key
4. Chọn Create new API Key và cấp quyền cho model FPT.TTS-pro (nếu giao diện yêu cầu).
5. Mở https://github.com/ophelianguyenn-ai/so-tay-hop-tieng-han/settings/secrets/actions
6. Thêm secret GitHub Actions tên **FPT_MARKETPLACE_API_KEY**, giá trị là khóa mới của Marketplace. Không dùng khóa Console cũ. Không gửi khóa trong chat hay đưa vào mã nguồn.

Trang tài liệu FPT Marketplace: https://marketplace.fptcloud.com/en/models/fpt-tts-pro

## Tự động cập nhật hằng ngày (từ 19/11/2026)

Workflow: .github/workflows/generate-daily-neural.yml

- Lịch tự động: **05:00 mỗi ngày theo giờ Việt Nam (UTC+7)**, GitHub Actions cron 0 22 * * * (UTC).
- Khi thêm nội dung vào lessons.json hoặc scripts/daily-audio-texts.json: một lượt nhỏ tự chạy ngay (tối đa 10 Việt + 20 Hàn).
- Hằng ngày: ưu tiên câu chưa có file âm thanh trong các bài mới nhất, rồi đến những câu còn giọng cũ.
- Giới hạn một lượt lịch: tối đa 100 câu tiếng Việt Ban Mai và 200 câu tiếng Hàn InJoon.
- Đã có MP3 đúng giọng và file hợp lệ thì bỏ qua, không tính phí tạo lại. MP3 cũ được giữ nguyên dự phòng.
- FPT Marketplace Ban Mai dùng secret FPT_MARKETPLACE_API_KEY. InJoon tiếng Hàn chạy độc lập, không cần FPT.
- Nếu FPT trả HTTP 401/403, ngừng ngay yêu cầu FPT; vẫn lưu và Publish những MP3 InJoon đã xác thực.
- Bài học chỉ lưu cục bộ trong trình duyệt, chưa đồng bộ về lessons.json, không nằm trong lịch tạo MP3.

Xem lịch chạy và nhật ký: https://github.com/ophelianguyenn-ai/so-tay-hop-tieng-han/actions/workflows/generate-daily-neural.yml

## Tạo MP3 an toàn

Actions → **Prepare FPT Marketplace Ban Mai and Korean InJoon audio batches** → Run workflow.
- Đầu tiên giữ dry_run=true để kiểm tra số câu, không phát sinh phí.
- Sau đó chạy thử language=vi, scope=daily, limit=1 hoặc 2, dry_run=false. Kiểm tra âm thanh trước khi chuyển nhiều câu.
- Chỉ chạy thêm khi kết quả chính xác. Ứng dụng không tự gọi FPT khi người dùng mở website.
- scope=daily: dữ liệu của scripts/daily-audio-texts.json.
- scope=all: các câu trong lessons.json và thẻ gốc.
- limit=0 nghĩa là tất cả, có thể phát sinh chi phí lớn. Không dùng trừ khi đã dự toán.

API mới dùng POST https://mkp-api.fptcloud.com/v1/audio/speech với Authorization: Bearer [Marketplace key] và JSON {model: "FPT.TTS-pro", voice: "std_banmai", input: "...", response_format: "wav"}.
File WAV được mã hóa sang MP3 bằng ffmpeg trên GitHub Actions, kiểm tra lại MP3 trước khi cập nhật audio-manifest.json.

Các MP3 Hoài My/SunHi cũ được giữ làm phương án dự phòng, không ghi đè; những câu chưa chuyển vẫn nghe được. Secret không bao giờ được xuất bản cùng GitHub Pages.

Kiểm thử offline không tốn tiền: python -m unittest scripts/test_selected_voices.py -v
