# Chuyển Nhi’s Learning Corner sang địa chỉ mới

Địa chỉ dự kiến: https://ophelia-ai.github.io/nhi-learning-corner/

`ophelia-ai` là tài khoản GitHub cá nhân đã có sẵn, không phải tên Organization còn trống. Việc chuyển repository cần được chủ tài khoản này chấp nhận.

## Trước khi chuyển repository

1. Trên **mỗi trình duyệt/thiết bị đã dùng để học**, mở website cũ trong đúng hồ sơ trình duyệt đó.
2. Mở `#/cai-dat` → **Xuất toàn bộ JSON trên thiết bị**. Giữ mỗi tệp JSON ở máy riêng; nếu có nhiều bản, đừng nhập đè mà chưa so sánh dữ liệu.
3. Xác nhận tệp có `type: "nhi-full-local-export"`, `version: 2`, và `keys` chứa tiến độ, bài theo ngày, ghi chú, cài đặt. Không đăng bản sao lưu chứa dữ liệu học lên repository công khai.
4. Nếu đã dùng GIF trang bìa tải từ máy, giữ cả tệp GIF gốc; ảnh này có thể nằm trong IndexedDB nên không có trong JSON.
5. Giữ cấu hình Firebase và mã đồng bộ ở nơi riêng tư. Bản JSON không xuất API key hoặc mã đồng bộ. Sau khi chuyển, kiểm tra đồng bộ với Firebase hiện tại trước khi sửa bài trên nhiều thiết bị.

## Sau khi chuyển và triển khai Pages

1. Mở địa chỉ mới, kiểm tra Hôm nay, Lịch học, một bài thẻ, Sổ tay và Cài đặt.
2. Mở `#/cai-dat` → **Cài đặt nâng cao** → **Nhập bản sao lưu** và chọn tệp JSON ở bước trước. Xác nhận thay thế dữ liệu trên **tên miền mới**; trang sẽ tự tải lại.
3. Kiểm tra lại số học phần, ghi chú, thẻ tự tạo, tiến độ và hiệu ứng. Đối chiếu với trang cũ hoặc tệp JSON. Nếu bạn dùng Firebase riêng thay vì cấu hình mặc định, nhập lại địa chỉ CSDL và mã đồng bộ của mình trong Cài đặt; không chia sẻ mã qua đường link công khai.
4. Kiểm tra Actions, Pages và tác vụ tạo âm thanh. Secret của workflow được GitHub giữ gắn với repository khi chuyển, nhưng vẫn cần xác nhận lượt chạy trên tài khoản mới.

Hai miền GitHub Pages có vùng lưu trữ trình duyệt khác nhau. Chuyển repository không tự mang dữ liệu `localStorage` hoặc ảnh trong IndexedDB sang miền mới. GitHub cũng không tự chuyển hướng URL Pages cũ; giữ các tệp sao lưu và đừng xóa dữ liệu trong trình duyệt cũ.
