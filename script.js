let rawData = [];
let currentFile = "dbhc.txt";
let lastResult = [];

const fileCache = {};

const input = document.getElementById("searchInput");
const tbody = document.getElementById("results");
const thead = document.getElementById("table-head");
const tabs = document.querySelectorAll(".tab");

/* =====================
   TỪ ĐIỂN ĐỒNG NGHĨA & LỊCH SỬ NGÂN HÀNG
===================== */
const bankGroups = [
    // 1. Nhóm chuyển giao bắt buộc / Đổi tên toàn diện (Lịch sử phức tạp nhất)
    { brand: "VCBNeo", fullname: "CBBank (Đại Tín / Xây dựng)", keys: ["vcbneo", "cong nghe so", "cbbank", "xay dung", "vncb", "dai tin", "trustbank"] },
    { brand: "Vikki Bank", fullname: "Đông Á", keys: ["vikki", "so vikki", "dong a", "dongabank"] },
    { brand: "MBV", fullname: "OceanBank (Đại Dương / Hải Hưng)", keys: ["mbv", "hien dai", "oceanbank", "dai duong", "hai hung"] },
    { brand: "GPBank", fullname: "Kỷ Nguyên Thịnh Vượng (Dầu khí Toàn cầu)", keys: ["gpbank", "ky nguyen", "dau khi", "toan cau", "ninh binh"] },
    { brand: "PGBank", fullname: "Thịnh vượng và Phát triển (Xăng dầu Petrolimex)", keys: ["pgbank", "thinh vuong va phat", "xang dau", "petrolimex"] },
    { brand: "LPBank", fullname: "Lộc Phát (Bưu điện Liên Việt)", keys: ["lpbank", "lvbank", "loc phat", "lien viet", "lienvietpostbank", "buu dien"] },
    { brand: "BVBank", fullname: "Bản Việt (Viet Capital / Gia Định)", keys: ["bvbank", "ban viet", "viet capital", "gia dinh"] },
    { brand: "NCB", fullname: "Quốc Dân (Nam Việt / Sông Kiên)", keys: ["ncb", "quoc dan", "nam viet", "navibank", "song kien"] },
    { brand: "PVcomBank", fullname: "Đại Chúng (Phương Tây / Tài chính Dầu khí)", keys: ["pvcombank", "dai chung", "phuong tay", "western bank", "pvfc"] },
    { brand: "SHB", fullname: "Sài Gòn - Hà Nội (Habubank / Nhơn Ái)", keys: ["shb", "sai gon ha noi", "habubank", "nhon ai"] },
    { brand: "SCB", fullname: "Sài Gòn (Đệ Nhất / Tín Nghĩa)", keys: ["scb", "ngan hang sai gon", "de nhat", "tin nghia"] },

    // 2. Nhóm Big 4 & Ngân hàng Chính sách
    { brand: "Agribank", fullname: "Nông nghiệp và Phát triển Nông thôn", keys: ["agribank", "nong nghiep", "nn pt"] },
    { brand: "BIDV", fullname: "Đầu tư và Phát triển", keys: ["bidv", "dau tu"] },
    { brand: "Vietcombank", fullname: "Ngoại thương", keys: ["vietcombank", "vcb", "ngoai thuong"] },
    { brand: "VietinBank", fullname: "Công thương", keys: ["vietinbank", "ctg", "cong thuong"] },
    { brand: "VBSP", fullname: "Chính sách xã hội", keys: ["vbsp", "chinh sach xa hoi", "chinh sach"] },
    { brand: "VDB", fullname: "Phát triển Việt Nam", keys: ["vdb", "phat trien viet nam", "phat trien vn"] },

    // 3. Nhóm TMCP lớn & Cổ phần khác
    { brand: "ACB", fullname: "Á Châu", keys: ["acb", "a chau"] },
    { brand: "ABBANK", fullname: "An Bình", keys: ["abbank", "an binh"] },
    { brand: "Bac A Bank", fullname: "Bắc Á", keys: ["bac a", "bac a bank"] },
    { brand: "BAOVIET Bank", fullname: "Bảo Việt", keys: ["baoviet", "bao viet"] },
    { brand: "SeABank", fullname: "Đông Nam Á", keys: ["seabank", "dong nam a"] },
    { brand: "MSB", fullname: "Hàng Hải (Maritime Bank)", keys: ["msb", "hang hai", "maritime"] },
    { brand: "Kienlongbank", fullname: "Kiên Long", keys: ["kienlongbank", "kien long"] },
    { brand: "Techcombank", fullname: "Kỹ Thương", keys: ["techcombank", "ky thuong"] },
    { brand: "Nam A Bank", fullname: "Nam Á", keys: ["nam a bank", "nam a"] },
    { brand: "HDBank", fullname: "Phát triển TP.HCM", keys: ["hdbank", "phat trien tp"] },
    { brand: "OCB", fullname: "Phương Đông", keys: ["ocb", "phuong dong"] },
    { brand: "MBBANK", fullname: "Quân Đội", keys: ["mbbank", "mb", "quan doi"] },
    { brand: "VIB", fullname: "Quốc Tế", keys: ["vib", "quoc te"] },
    { brand: "SAIGONBANK", fullname: "Sài Gòn Công Thương", keys: ["saigonbank", "sai gon cong thuong"] },
    { brand: "Sacombank", fullname: "Sài Gòn Thương Tín", keys: ["sacombank", "sai gon thuong tin"] },
    { brand: "TPBank", fullname: "Tiên Phong", keys: ["tpbank", "tien phong"] },
    { brand: "VietABank", fullname: "Việt Á", keys: ["vietabank", "viet a"] },
    { brand: "VPBank", fullname: "Việt Nam Thịnh Vượng", keys: ["vpbank", "vpb", "viet nam thinh vuong"] },
    { brand: "Vietbank", fullname: "Việt Nam Thương Tín", keys: ["vietbank", "viet nam thuong tin"] },
    { brand: "Eximbank", fullname: "Xuất Nhập Khẩu", keys: ["eximbank", "eib", "xuat nhap khau"] },

    // 4. Nhóm Liên doanh & Hợp tác xã
    { brand: "IVB", fullname: "Indovina", keys: ["ivb", "indovina"] },
    { brand: "VRB", fullname: "Việt Nga", keys: ["vrb", "viet nga"] },
    { brand: "Co-opBank", fullname: "Hợp tác xã (Quỹ TDND)", keys: ["coopbank", "hop tac xa", "quy tin dung"] }
];

/* =====================
   CHUẨN HÓA TIẾNG VIỆT
===================== */
function normalize(str) {
    if (!str) return "";
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9 ]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/* =====================
  RENDER KẾT QUẢ (CÓ TÍCH HỢP TAG HIỂN THỊ CHÉO)
===================== */
function renderResults(results, keyword) {
    tbody.innerHTML = "";
    lastResult = results;
    
    const highlightKeys = keyword.split(" ").filter(k => k.trim() !== "");

    results.forEach(obj => {
        const cols = obj.line.split(/\t| {2,}/);
        const tr = document.createElement("tr");

        cols.forEach((col, index) => {
            let html = col;
            
            // Highlight từ khóa
            highlightKeys.forEach(k => {
                if (k.length > 0) {
                    const safeK = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const reg = new RegExp(`(${safeK})`, "gi");
                    html = html.replace(reg, "<mark>$1</mark>");
                }
            });

            // Nếu là tab Ngân hàng, cột Tên (cột index 1) và có chứa tag đồng nghĩa thì nối tag vào
            if (currentFile === "nganhang.txt" && index === 1 && obj.tag) {
                html += obj.tag;
            }

            const td = document.createElement("td");
            td.innerHTML = html;
            tr.appendChild(td);
        });

        tr.onclick = () => {
            let textToCopy = cols[0] || ""; 
            let message = "Đã copy Mã: " + textToCopy;

            if (textToCopy) {
                navigator.clipboard.writeText(textToCopy)
                    .then(() => alert(message))
                    .catch(err => console.error("Lỗi copy: ", err));
            }
        };
        tr.style.cursor = "pointer";
        tbody.appendChild(tr);
    });
}

/* =====================
   LOAD FILE 
===================== */
async function loadFile(file) {
    input.value = "";
    tbody.innerHTML = "";
    rawData = [];

    buildHeader(file);

    input.disabled = false;
    input.focus();

    input.placeholder = "Đang nạp dữ liệu...";
    try {
        if (fileCache[file]) {
            rawData = fileCache[file];
        } else {
            const res = await fetch("data/" + file);
            const text = await res.text();
            rawData = text.split(/\r?\n/).filter(x => x.trim());
            fileCache[file] = rawData;
        }
        input.placeholder = "Nhập từ khóa tìm kiếm...";
    } catch (err) {
        input.placeholder = "Lỗi: Không tải được dữ liệu!";
        console.error(err);
    }
}

loadFile(currentFile);

/* =====================
   HEADER TABLE
===================== */
function buildHeader(file) {
    if (file === "dbhc.txt")
        thead.innerHTML = "<th>Mã</th><th>Phường / Xã</th><th>Tỉnh / Huyện</th>";
    else if (file === "kbnn.txt")
        thead.innerHTML = "<th>Tên Kho bạc</th><th>Mã</th><th>Tỉnh</th>";
    else // Cập nhật lại cho khớp với format 2 cột của bạn
        thead.innerHTML = "<th>Mã</th><th>Tên Chi nhánh Ngân hàng</th>";
}

/* =====================
   SEARCH DBHC & KBNN (GIỮ NGUYÊN)
===================== */
function searchDBHC(keyword) {
    const q = normalize(keyword);
    const keys = q.split(" ");
    let results = [];

    for (let line of rawData) {
        const cols = line.split(/\t| {2,}/);
        const ma = cols[0] || "";
        const ten = cols[1] || "";
        const tinh = cols[2] || "";

        const nTen = normalize(ten);
        const nTinh = normalize(tinh);
        const full = normalize(ten + " " + tinh);

        let score = 0;
        if (nTen === q) score += 1000;
        if (nTen.includes(q)) score += 800;
        if (full.includes(q)) score += 600;

        const tenWords = nTen.split(" ");
        if (keys.length === tenWords.length) {
            const a = [...keys].sort().join(" ");
            const b = [...tenWords].sort().join(" ");
            if (a === b) score += 300;
        }

        keys.forEach(k => {
            if (nTen.includes(k)) score += 80;
            if (nTinh.includes(k)) score += 40;
        });

        if (ma.includes(keyword)) score += 900;
        if (score > 0) results.push({ line, score });
    }
    results.sort((a, b) => b.score - a.score);
    return results;
}

/* =====================
   SEARCH NGÂN HÀNG (TỐI ƯU NHẬN DIỆN CHÉO 2 CHIỀU)
===================== */
function searchNormal(keyword) {
    const q = normalize(keyword);
    const keys = q.split(" ").filter(k => k.trim() !== "");
    let results = [];
    const isNganHang = currentFile === "nganhang.txt";

    for (let line of rawData) {
        let searchableStr = normalize(line);
        let tagHtml = "";

        // Tự động đối chiếu và nhồi thêm từ khóa nếu là tab Ngân hàng
        if (isNganHang) {
            const matchedGroup = bankGroups.find(g => 
                g.keys.some(k => searchableStr.includes(k)) || 
                searchableStr.includes(normalize(g.brand))
            );

            if (matchedGroup) {
                // ĐIỂM TỐI ƯU: Nhồi cả brand, fullname và keys vào chuỗi ngầm.
                // Điều này giúp user gõ "đầu tư và phát triển" thì dòng chỉ có chữ "BIDV" vẫn match đủ các từ.
                const extraInfo = normalize(`${matchedGroup.brand} ${matchedGroup.fullname} ${matchedGroup.keys.join(" ")}`);
                searchableStr += " " + extraInfo;
                
                // Tạo thẻ hiển thị thông tin đính kèm
                tagHtml = `<br><span style="color: #007bff; font-size: 0.85em; font-weight: bold;">(💡 ${matchedGroup.brand} - ${matchedGroup.fullname})</span>`;
            }
        }

        // Bắt buộc phải chứa TẤT CẢ các từ khóa user nhập vào
        const isMatchAll = keys.every(k => searchableStr.includes(k));
        if (!isMatchAll) continue; 

        // Tính điểm ưu tiên để xếp hạng kết quả
        let score = 0;
        
        // Nếu chuỗi (đã bao gồm phần nhồi thêm) chứa nguyên cụm từ khóa user gõ -> Ưu tiên cao nhất
        if (searchableStr.includes(q)) score += 1000; 

        keys.forEach(k => {
            const paddedN = " " + searchableStr + " ";
            const paddedK = " " + k + " ";
            if (paddedN.includes(paddedK)) score += 50; 
            else score += 20; 
        });

        // Đẩy kèm biến tagHtml vào kết quả để render hiển thị
        results.push({ line, score, tag: tagHtml });
    }
    
    // Sắp xếp kết quả từ cao xuống thấp
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 50);
}

/* =====================
   SỰ KIỆN TÌM KIẾM REAL-TIME (CÓ DEBOUNCE - CHỐNG LAG)
===================== */
let searchTimeout = null; // Khai báo biến lưu trữ bộ đếm thời gian

input.addEventListener("input", () => {
    const keyword = input.value.trim();
    
    // Hủy bỏ lệnh tìm kiếm trước đó nếu người dùng vẫn đang tiếp tục gõ
    clearTimeout(searchTimeout);

    if (!keyword) {
        tbody.innerHTML = "";
        return;
    }

    // Thiết lập thời gian chờ (300ms) sau khi người dùng ngừng gõ mới chạy tìm kiếm
    searchTimeout = setTimeout(() => {
        let results = [];
        if (currentFile === "dbhc.txt") {
            results = searchDBHC(keyword);
        } else {
            results = searchNormal(keyword);
        }

        renderResults(results, keyword);
    }, 300); // Bạn có thể tăng lên 400 hoặc 500 nếu máy tính/điện thoại yếu hơn
});

/* =====================
   SỰ KIỆN CHUYỂN TAB
===================== */
tabs.forEach(tab => {
    tab.onclick = () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        currentFile = tab.dataset.file.trim(); 
        loadFile(currentFile);
    };
});
