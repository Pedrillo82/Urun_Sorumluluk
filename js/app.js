// Ürün Sorumluluk Sigortası Teklif Sistemi - Ana JavaScript Dosyası

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    // Bugünün tarihini başlangıç tarihi olarak ayarla
    const bugun = new Date().toISOString().split('T')[0];
    document.getElementById('baslangicTarihi').value = bugun;

    // Form submit engelle
    document.getElementById('teklifForm').addEventListener('submit', function(e) {
        e.preventDefault();
    });
});

// Fiyat katsayıları (bu değerler sonradan güncellenebilir)
const FIYAT_KATSAYILARI = {
    urunTuru: {
        gida: 1.5,
        elektronik: 1.2,
        kimyasal: 2.0,
        tekstil: 0.8,
        makine: 1.4,
        otomotiv: 1.6,
        kozmetik: 1.3,
        medikal: 1.8,
        diger: 1.0
    },
    teminatLimiti: {
        '100000': 1.0,
        '250000': 1.8,
        '500000': 3.2,
        '1000000': 5.5,
        '2500000': 12.0,
        '5000000': 22.0
    },
    muafiyet: {
        '0': 1.0,
        '1000': 0.95,
        '2500': 0.90,
        '5000': 0.85,
        '10000': 0.80
    },
    ekTeminat: {
        geriCagirma: 2500,
        hukukiMasraf: 1500,
        itibarKoruma: 2000,
        cevreSorumluluk: 3000
    },
    ihracatKatsayi: 0.005, // Her %1 ihracat için ek katsayı
    temelPrim: 1000 // Temel prim (TL)
};

// Form verilerini topla
function formVerileriniTopla() {
    return {
        // Firma Bilgileri
        firmaAdi: document.getElementById('firmaAdi').value,
        vergiNo: document.getElementById('vergiNo').value,
        adres: document.getElementById('adres').value,
        telefon: document.getElementById('telefon').value,
        email: document.getElementById('email').value,
        yetkili: document.getElementById('yetkili').value,

        // Ürün Bilgileri
        urunTuru: document.getElementById('urunTuru').value,
        urunTuruText: document.getElementById('urunTuru').options[document.getElementById('urunTuru').selectedIndex].text,
        urunAciklama: document.getElementById('urunAciklama').value,
        yillikCiro: parseFloat(document.getElementById('yillikCiro').value) || 0,
        ihracatOrani: parseFloat(document.getElementById('ihracatOrani').value) || 0,

        // Teminat Bilgileri
        teminatLimiti: document.getElementById('teminatLimiti').value,
        teminatLimitiText: document.getElementById('teminatLimiti').options[document.getElementById('teminatLimiti').selectedIndex].text,
        muafiyet: document.getElementById('muafiyet').value,
        muafiyetText: document.getElementById('muafiyet').options[document.getElementById('muafiyet').selectedIndex].text,
        policeSuresi: document.getElementById('policeSuresi').value,
        baslangicTarihi: document.getElementById('baslangicTarihi').value,

        // Ek Teminatlar
        geriCagirma: document.getElementById('geriCagirma').checked,
        hukukiMasraf: document.getElementById('hukukiMasraf').checked,
        itibarKoruma: document.getElementById('itibarKoruma').checked,
        cevreSorumluluk: document.getElementById('cevreSorumluluk').checked
    };
}

// Form doğrulama
function formDogrula(veriler) {
    const zorunluAlanlar = [
        { alan: 'firmaAdi', mesaj: 'Firma adı zorunludur' },
        { alan: 'vergiNo', mesaj: 'Vergi numarası zorunludur' },
        { alan: 'adres', mesaj: 'Adres zorunludur' },
        { alan: 'telefon', mesaj: 'Telefon zorunludur' },
        { alan: 'email', mesaj: 'E-posta zorunludur' },
        { alan: 'yetkili', mesaj: 'Yetkili kişi zorunludur' },
        { alan: 'urunTuru', mesaj: 'Ürün türü seçiniz' },
        { alan: 'urunAciklama', mesaj: 'Ürün açıklaması zorunludur' },
        { alan: 'yillikCiro', mesaj: 'Yıllık ciro zorunludur' },
        { alan: 'teminatLimiti', mesaj: 'Teminat limiti seçiniz' },
        { alan: 'muafiyet', mesaj: 'Muafiyet seçiniz' },
        { alan: 'baslangicTarihi', mesaj: 'Başlangıç tarihi zorunludur' }
    ];

    for (const { alan, mesaj } of zorunluAlanlar) {
        if (!veriler[alan] || veriler[alan] === '') {
            alert(mesaj);
            document.getElementById(alan.replace('Text', '')).focus();
            return false;
        }
    }

    // E-posta formatı kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(veriler.email)) {
        alert('Geçerli bir e-posta adresi giriniz');
        document.getElementById('email').focus();
        return false;
    }

    return true;
}

// Prim hesaplama
function primHesapla(veriler) {
    let prim = FIYAT_KATSAYILARI.temelPrim;

    // Ürün türü katsayısı
    const urunKatsayi = FIYAT_KATSAYILARI.urunTuru[veriler.urunTuru] || 1.0;
    prim *= urunKatsayi;

    // Teminat limiti katsayısı
    const limitKatsayi = FIYAT_KATSAYILARI.teminatLimiti[veriler.teminatLimiti] || 1.0;
    prim *= limitKatsayi;

    // Muafiyet indirimi
    const muafiyetKatsayi = FIYAT_KATSAYILARI.muafiyet[veriler.muafiyet] || 1.0;
    prim *= muafiyetKatsayi;

    // Ciro bazlı ek prim (her 1 milyon TL için %5 ek)
    const ciroEk = (veriler.yillikCiro / 1000000) * 0.05 * prim;
    prim += ciroEk;

    // İhracat oranı ek primi
    const ihracatEk = veriler.ihracatOrani * FIYAT_KATSAYILARI.ihracatKatsayi * prim;
    prim += ihracatEk;

    // Ek teminat primleri
    let ekTeminatToplam = 0;
    if (veriler.geriCagirma) ekTeminatToplam += FIYAT_KATSAYILARI.ekTeminat.geriCagirma;
    if (veriler.hukukiMasraf) ekTeminatToplam += FIYAT_KATSAYILARI.ekTeminat.hukukiMasraf;
    if (veriler.itibarKoruma) ekTeminatToplam += FIYAT_KATSAYILARI.ekTeminat.itibarKoruma;
    if (veriler.cevreSorumluluk) ekTeminatToplam += FIYAT_KATSAYILARI.ekTeminat.cevreSorumluluk;

    prim += ekTeminatToplam;

    // Poliçe süresi çarpanı
    prim *= parseInt(veriler.policeSuresi);

    return {
        temelPrim: FIYAT_KATSAYILARI.temelPrim,
        urunKatsayi: urunKatsayi,
        limitKatsayi: limitKatsayi,
        muafiyetKatsayi: muafiyetKatsayi,
        ciroEk: ciroEk,
        ihracatEk: ihracatEk,
        ekTeminatToplam: ekTeminatToplam,
        toplamPrim: Math.round(prim * 100) / 100
    };
}

// Para formatı
function paraFormat(sayi) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2
    }).format(sayi);
}

// Tarih formatı
function tarihFormat(tarihStr) {
    const tarih = new Date(tarihStr);
    return tarih.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Bitiş tarihi hesapla
function bitisTarihiHesapla(baslangic, sure) {
    const tarih = new Date(baslangic);
    tarih.setFullYear(tarih.getFullYear() + parseInt(sure));
    tarih.setDate(tarih.getDate() - 1);
    return tarih.toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Teklif numarası oluştur
function teklifNoOlustur() {
    const tarih = new Date();
    const yil = tarih.getFullYear();
    const ay = String(tarih.getMonth() + 1).padStart(2, '0');
    const gun = String(tarih.getDate()).padStart(2, '0');
    const rastgele = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `US-${yil}${ay}${gun}-${rastgele}`;
}

// Teklif hesapla ve önizleme göster
function teklifHesapla() {
    const veriler = formVerileriniTopla();

    // Form doğrulama
    if (!formDogrula(veriler)) {
        return;
    }

    // Prim hesapla
    const primBilgisi = primHesapla(veriler);
    const teklifNo = teklifNoOlustur();
    const bugun = new Date().toLocaleDateString('tr-TR');

    // Ek teminatları listele
    const ekTeminatlar = [];
    if (veriler.geriCagirma) ekTeminatlar.push('Ürün Geri Çağırma');
    if (veriler.hukukiMasraf) ekTeminatlar.push('Hukuki Masraflar');
    if (veriler.itibarKoruma) ekTeminatlar.push('İtibar Koruma');
    if (veriler.cevreSorumluluk) ekTeminatlar.push('Çevre Sorumluluk');

    // PDF içeriğini oluştur
    const pdfIcerik = `
        <div class="pdf-header">
            <h1>ÜRÜN SORUMLULUK SİGORTASI</h1>
            <p>TEKLİF FORMU</p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 0.9rem; color: #64748b;">
            <span><strong>Teklif No:</strong> ${teklifNo}</span>
            <span><strong>Teklif Tarihi:</strong> ${bugun}</span>
        </div>

        <div class="pdf-section">
            <h3>Sigortalı Bilgileri</h3>
            <table class="pdf-table">
                <tr><td>Firma Adı</td><td>${veriler.firmaAdi}</td></tr>
                <tr><td>Vergi No</td><td>${veriler.vergiNo}</td></tr>
                <tr><td>Adres</td><td>${veriler.adres}</td></tr>
                <tr><td>Telefon</td><td>${veriler.telefon}</td></tr>
                <tr><td>E-posta</td><td>${veriler.email}</td></tr>
                <tr><td>Yetkili Kişi</td><td>${veriler.yetkili}</td></tr>
            </table>
        </div>

        <div class="pdf-section">
            <h3>Ürün Bilgileri</h3>
            <table class="pdf-table">
                <tr><td>Ürün Türü</td><td>${veriler.urunTuruText}</td></tr>
                <tr><td>Ürün Açıklaması</td><td>${veriler.urunAciklama}</td></tr>
                <tr><td>Yıllık Ciro</td><td>${paraFormat(veriler.yillikCiro)}</td></tr>
                <tr><td>İhracat Oranı</td><td>%${veriler.ihracatOrani}</td></tr>
            </table>
        </div>

        <div class="pdf-section">
            <h3>Teminat Bilgileri</h3>
            <table class="pdf-table">
                <tr><td>Teminat Limiti</td><td>${veriler.teminatLimitiText}</td></tr>
                <tr><td>Muafiyet</td><td>${veriler.muafiyetText}</td></tr>
                <tr><td>Poliçe Süresi</td><td>${veriler.policeSuresi} Yıl</td></tr>
                <tr><td>Başlangıç Tarihi</td><td>${tarihFormat(veriler.baslangicTarihi)}</td></tr>
                <tr><td>Bitiş Tarihi</td><td>${bitisTarihiHesapla(veriler.baslangicTarihi, veriler.policeSuresi)}</td></tr>
            </table>
        </div>

        ${ekTeminatlar.length > 0 ? `
        <div class="pdf-section">
            <h3>Ek Teminatlar</h3>
            <table class="pdf-table">
                ${ekTeminatlar.map(t => `<tr><td colspan="2" style="background: none;">\u2713 ${t}</td></tr>`).join('')}
            </table>
        </div>
        ` : ''}

        <div class="pdf-total">
            <h3>TOPLAM PRİM</h3>
            <div class="amount">${paraFormat(primBilgisi.toplamPrim)}</div>
            <p style="font-size: 0.85rem; margin-top: 10px; opacity: 0.9;">
                (KDV ve vergiler dahil değildir)
            </p>
        </div>

        <div class="pdf-footer">
            <p>Bu teklif bilgilendirme amaçlıdır ve bağlayıcı değildir.</p>
            <p>Teklif geçerlilik süresi: 30 gündür.</p>
            <p>Detaylı bilgi için lütfen bizimle iletişime geçiniz.</p>
        </div>
    `;

    // Önizlemeyi göster
    document.getElementById('pdfIcerik').innerHTML = pdfIcerik;
    document.getElementById('teklifOnizleme').style.display = 'block';

    // Önizlemeye scroll
    document.getElementById('teklifOnizleme').scrollIntoView({ behavior: 'smooth' });
}

// PDF oluştur ve indir
async function pdfOlustur() {
    const { jsPDF } = window.jspdf;
    const element = document.getElementById('pdfIcerik');

    try {
        // HTML2Canvas ile elementi resme çevir
        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        // PDF oluştur
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 10;

        pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio * 0.95, imgHeight * ratio * 0.95);

        // Teklif numarasını dosya adı olarak kullan
        const teklifNo = document.querySelector('.pdf-header').nextElementSibling.textContent.match(/US-[\d-]+/)[0];
        pdf.save(`Teklif_${teklifNo}.pdf`);

    } catch (error) {
        console.error('PDF oluşturma hatası:', error);
        alert('PDF oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    }
}

// Formu temizle
function formTemizle() {
    if (confirm('Form temizlenecek. Emin misiniz?')) {
        document.getElementById('teklifForm').reset();
        document.getElementById('teklifOnizleme').style.display = 'none';

        // Bugünün tarihini tekrar ayarla
        const bugun = new Date().toISOString().split('T')[0];
        document.getElementById('baslangicTarihi').value = bugun;

        // Sayfanın başına scroll
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}
