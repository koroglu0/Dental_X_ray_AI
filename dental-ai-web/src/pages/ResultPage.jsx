import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { result, imageUrl } = location.state || {};
  const [selectedFinding, setSelectedFinding] = useState(null);
  const [showMarkers, setShowMarkers] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [aiReport, setAiReport] = useState(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  if (!result) {
    navigate('/');
    return null;
  }

  const findings = result.findings || [];

  // İstatistikleri hesapla
  const stats = {
    total: findings.length,
    highRisk: findings.filter(f => f.risk === 'High Risk').length,
    mediumRisk: findings.filter(f => f.risk === 'Medium').length,
    lowRisk: findings.filter(f => f.risk === 'Info').length,
    avgConfidence: findings.length > 0 
      ? (findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length).toFixed(1)
      : 0
  };

  // Canvas üzerinde bounding box'ları çiz
  useEffect(() => {
    if (!canvasRef.current || !imageRef.current || !showMarkers || findings.length === 0) {
      return;
    }

    const canvas = canvasRef.current;
    const image = imageRef.current;
    const ctx = canvas.getContext('2d');

    // Canvas boyutunu görselle eşitle
    const updateCanvas = () => {
      const rect = image.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;

      // Canvas'ı temizle
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Her bulgu için bounding box çiz
      findings.forEach((finding, index) => {
        if (!finding.bbox) return;

        const { x1, y1, x2, y2 } = finding.bbox;
        
        // Normalize edilmiş koordinatları canvas boyutuna çevir
        const boxX = x1 * canvas.width;
        const boxY = y1 * canvas.height;
        const boxWidth = (x2 - x1) * canvas.width;
        const boxHeight = (y2 - y1) * canvas.height;

        // Risk seviyesine göre renk belirle
        let color;
        switch (finding.risk) {
          case 'High Risk':
            color = 'rgba(239, 68, 68, 0.8)'; // red-500
            break;
          case 'Medium':
            color = 'rgba(249, 115, 22, 0.8)'; // orange-500
            break;
          default:
            color = 'rgba(34, 197, 94, 0.8)'; // green-500
        }

        // Bounding box çiz
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

        // Seçili bulgu için daha kalın çerçeve
        if (selectedFinding === finding) {
          ctx.strokeStyle = 'rgba(19, 164, 236, 1)'; // primary color
          ctx.lineWidth = 4;
          ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
        }

        // Label arka planı
        const label = `${index + 1}. ${finding.name}`;
        ctx.font = 'bold 14px Space Grotesk, sans-serif';
        const textMetrics = ctx.measureText(label);
        const textWidth = textMetrics.width;
        const textHeight = 20;

        // Label pozisyonu (box'ın üstünde)
        const labelX = boxX;
        const labelY = boxY - textHeight - 5;

        // Label arka plan
        ctx.fillStyle = color;
        ctx.fillRect(labelX, labelY, textWidth + 10, textHeight);

        // Label metni
        ctx.fillStyle = 'white';
        ctx.fillText(label, labelX + 5, labelY + 15);

        // Güven skoru
        if (finding.confidence) {
          const confidenceText = `${Math.round(finding.confidence)}%`;
          ctx.font = '12px Space Grotesk, sans-serif';
          const confWidth = ctx.measureText(confidenceText).width;
          
          // Güven skoru arka plan (box'ın altında)
          ctx.fillStyle = color;
          ctx.fillRect(boxX, boxY + boxHeight + 5, confWidth + 10, 18);
          
          // Güven skoru metni
          ctx.fillStyle = 'white';
          ctx.fillText(confidenceText, boxX + 5, boxY + boxHeight + 18);
        }
      });
    };

    // Görsel yüklendiğinde canvas'ı güncelle
    if (image.complete) {
      updateCanvas();
    } else {
      image.addEventListener('load', updateCanvas);
    }

    // Pencere boyutu değiştiğinde canvas'ı güncelle
    window.addEventListener('resize', updateCanvas);

    return () => {
      image.removeEventListener('load', updateCanvas);
      window.removeEventListener('resize', updateCanvas);
    };
  }, [findings, showMarkers, selectedFinding, zoom, position]);

  // Prevent scroll on wheel event
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventScroll = (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleWheel(e);
    };

    container.addEventListener('wheel', preventScroll, { passive: false });

    return () => {
      container.removeEventListener('wheel', preventScroll);
    };
  }, [zoom, position]);

  // Zoom handler
  const handleWheel = (e) => {
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(Math.max(1, zoom + delta), 5);
    
    if (newZoom === 1) {
      setPosition({ x: 0, y: 0 });
    }
    setZoom(newZoom);
  };

  // Pan handlers
  const handleMouseDown = (e) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Reset zoom
  const resetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  // Zoom in/out buttons
  const zoomIn = () => {
    const newZoom = Math.min(zoom + 0.5, 5);
    setZoom(newZoom);
  };

  const zoomOut = () => {
    const newZoom = Math.max(zoom - 0.5, 1);
    if (newZoom === 1) {
      setPosition({ x: 0, y: 0 });
    }
    setZoom(newZoom);
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'High Risk':
        return 'bg-red-500/20 text-red-500';
      case 'Medium':
        return 'bg-orange-500/20 text-orange-500';
      case 'Info':
        return 'bg-green-500/20 text-green-500';
      default:
        return 'bg-gray-500/20 text-gray-500';
    }
  };

  const getRiskText = (risk) => {
    switch (risk) {
      case 'High Risk':
        return 'Yüksek Risk';
      case 'Medium':
        return 'Orta Risk';
      case 'Info':
        return 'Bilgi';
      default:
        return risk;
    }
  };

  // AI ile rapor oluştur
  const generateAIReport = async () => {
    setIsGeneratingReport(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ findings })
      });

      if (response.ok) {
        const data = await response.json();
        setAiReport(data.report);
        return data.report;
      } else {
        console.error('AI rapor hatası');
        return null;
      }
    } catch (error) {
      console.error('AI rapor oluşturma hatası:', error);
      return null;
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const downloadPDFReport = async () => {
    try {
      setIsGeneratingReport(true);
      console.log('PDF indirme başlatılıyor...');
      
      // Önce AI raporu oluştur
      let report = aiReport;
      if (!report) {
        console.log('AI raporu oluşturuluyor...');
        report = await generateAIReport();
      }
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
    
    // ===== SAYFA 1: KAPAK =====
    doc.setFontSize(24);
    doc.setTextColor(19, 164, 236);
    doc.text('AI Dental Analiz Raporu', pageWidth / 2, 30, { align: 'center' });
    
    // Alt başlık
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text('Yapay Zeka Destekli Detaylı Klinik Değerlendirme', pageWidth / 2, 40, { align: 'center' });
    
    // Tarih ve bilgiler
    doc.setFontSize(10);
    doc.text(`Analiz Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, pageWidth / 2, 55, { align: 'center' });
    doc.text(`Saat: ${new Date().toLocaleTimeString('tr-TR')}`, pageWidth / 2, 62, { align: 'center' });
    
    // Çizgi
    doc.setDrawColor(19, 164, 236);
    doc.setLineWidth(0.5);
    doc.line(30, 70, pageWidth - 30, 70);
    
    let yPosition = 85;

    // Röntgen görselini ekle
    if (imageRef.current && imageRef.current.complete) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageUrl.startsWith('data:') ? imageUrl : imageUrl;
        });
        
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.naturalWidth || img.width;
        tempCanvas.height = img.naturalHeight || img.height;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        // Bounding box'ları çiz
        findings.forEach((finding, index) => {
          if (!finding.bbox) return;
          const { x1, y1, x2, y2 } = finding.bbox;
          const boxX = x1 * tempCanvas.width;
          const boxY = y1 * tempCanvas.height;
          const boxWidth = (x2 - x1) * tempCanvas.width;
          const boxHeight = (y2 - y1) * tempCanvas.height;

          let color;
          switch (finding.risk) {
            case 'High Risk': color = 'rgb(239, 68, 68)'; break;
            case 'Medium': color = 'rgb(249, 115, 22)'; break;
            default: color = 'rgb(34, 197, 94)';
          }

          ctx.strokeStyle = color;
          ctx.lineWidth = 4;
          ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

          const label = `${index + 1}. ${finding.name}`;
          ctx.font = 'bold 24px Arial';
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = color;
          ctx.fillRect(boxX, boxY - 38, textWidth + 16, 30);
          ctx.fillStyle = 'white';
          ctx.fillText(label, boxX + 8, boxY - 12);
        });
        
        const imgData = tempCanvas.toDataURL('image/jpeg', 0.8);
        const imgWidth = pageWidth - 40;
        const imgHeight = (tempCanvas.height * imgWidth) / tempCanvas.width;
        
        if (imgHeight > 120) {
          const ratio = 120 / imgHeight;
          doc.addImage(imgData, 'JPEG', (pageWidth - imgWidth * ratio) / 2, yPosition, imgWidth * ratio, 120);
          yPosition += 130;
        } else {
          doc.addImage(imgData, 'JPEG', 20, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
        }
      } catch (error) {
        console.error('Görsel PDF\'e eklenirken hata:', error);
      }
    }

    // ===== SAYFA 2: AI ÖZETİ =====
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(16);
    doc.setTextColor(19, 164, 236);
    doc.text('🤖 AI Klinik Değerlendirme', 15, yPosition);
    yPosition += 12;

    if (report) {
      // Özet
      if (report.ozet) {
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text('Genel Değerlendirme:', 15, yPosition);
        yPosition += 6;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        const ozetLines = doc.splitTextToSize(report.ozet, pageWidth - 30);
        doc.text(ozetLines, 15, yPosition);
        yPosition += ozetLines.length * 5 + 8;
      }

      // Risk Değerlendirmesi
      if (report.risk_degerlendirmesi) {
        doc.setFontSize(11);
        doc.setTextColor(239, 68, 68);
        doc.setFont(undefined, 'bold');
        doc.text('⚠️ Risk Değerlendirmesi:', 15, yPosition);
        yPosition += 6;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const riskLines = doc.splitTextToSize(report.risk_degerlendirmesi, pageWidth - 30);
        doc.text(riskLines, 15, yPosition);
        yPosition += riskLines.length * 5 + 8;
      }

      // Acil Müdahale
      if (report.acil_mudahale && report.acil_mudahale.length > 10) {
        doc.setFillColor(255, 240, 240);
        doc.rect(15, yPosition - 3, pageWidth - 30, 20, 'F');
        doc.setFontSize(10);
        doc.setTextColor(200, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text('🚨 ACİL:', 17, yPosition + 4);
        doc.setFont(undefined, 'normal');
        const acilLines = doc.splitTextToSize(report.acil_mudahale, pageWidth - 50);
        doc.text(acilLines, 35, yPosition + 4);
        yPosition += 25;
      }

      // Tedavi Planı
      if (report.tedavi_plani) {
        doc.setFontSize(11);
        doc.setTextColor(34, 197, 94);
        doc.setFont(undefined, 'bold');
        doc.text('📋 Önerilen Tedavi Planı:', 15, yPosition);
        yPosition += 6;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const tedaviLines = doc.splitTextToSize(report.tedavi_plani, pageWidth - 30);
        doc.text(tedaviLines, 15, yPosition);
        yPosition += tedaviLines.length * 5 + 8;
      }

      // Takip Önerileri
      if (report.takip_onerileri) {
        doc.setFontSize(11);
        doc.setTextColor(19, 164, 236);
        doc.setFont(undefined, 'bold');
        doc.text('📅 Takip Önerileri:', 15, yPosition);
        yPosition += 6;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const takipLines = doc.splitTextToSize(report.takip_onerileri, pageWidth - 30);
        doc.text(takipLines, 15, yPosition);
        yPosition += takipLines.length * 5 + 8;
      }
    }

    // ===== SAYFA 3: BULGULAR TABLOSU =====
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(16);
    doc.setTextColor(19, 164, 236);
    doc.text('📊 Tespit Edilen Bulgular', 15, yPosition);
    yPosition += 12;

    // İstatistikler
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`Toplam: ${findings.length} bulgu | Yüksek Risk: ${stats.highRisk} | Orta Risk: ${stats.mediumRisk} | Düşük Risk: ${stats.lowRisk}`, 15, yPosition);
    yPosition += 10;

    // Bulgular tablosu
    const tableData = findings.map((finding, index) => [
      `${index + 1}`,
      finding.name,
      finding.location,
      getRiskText(finding.risk),
      `${Math.round(finding.confidence)}%`
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Bulgu', 'Konum', 'Risk', 'Güven']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [19, 164, 236],
        textColor: [255, 255, 255],
        fontSize: 10,
        fontStyle: 'bold'
      },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 55 },
        2: { cellWidth: 45 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25 }
      },
      margin: { left: 15, right: 15 }
    });

    // ===== SAYFA 4+: DETAYLI BULGULAR =====
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(16);
    doc.setTextColor(19, 164, 236);
    doc.text('📝 Detaylı Bulgu Analizi', 15, yPosition);
    yPosition += 15;

    // AI detaylı bulgular varsa kullan
    const detayliBulgular = report?.detayli_bulgular || [];

    findings.forEach((finding, index) => {
      if (yPosition > pageHeight - 70) {
        doc.addPage();
        yPosition = 20;
      }

      // Bulgu başlığı
      let riskColor;
      switch (finding.risk) {
        case 'High Risk': riskColor = [239, 68, 68]; break;
        case 'Medium': riskColor = [249, 115, 22]; break;
        default: riskColor = [34, 197, 94];
      }
      
      doc.setFillColor(...riskColor);
      doc.rect(15, yPosition - 4, 5, 18, 'F');
      
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text(`${index + 1}. ${finding.name}`, 25, yPosition + 4);
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Konum: ${finding.location} | Risk: ${getRiskText(finding.risk)} | Güven: ${Math.round(finding.confidence)}%`, 25, yPosition + 12);
      yPosition += 22;

      // AI detaylı bulgu varsa
      const aiDetay = detayliBulgular.find(d => d.bulgu?.toLowerCase().includes(finding.name?.toLowerCase().split(' ')[0]));
      
      if (aiDetay) {
        if (aiDetay.klinik_onemi) {
          doc.setFontSize(10);
          doc.setTextColor(19, 164, 236);
          doc.text('Klinik Önemi:', 20, yPosition);
          yPosition += 5;
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          const onemiLines = doc.splitTextToSize(aiDetay.klinik_onemi, pageWidth - 40);
          doc.text(onemiLines, 25, yPosition);
          yPosition += onemiLines.length * 4 + 4;
        }
        
        if (aiDetay.tedavi_onerileri) {
          doc.setFontSize(10);
          doc.setTextColor(34, 197, 94);
          doc.text('Tedavi Önerisi:', 20, yPosition);
          yPosition += 5;
          doc.setFontSize(9);
          doc.setTextColor(60, 60, 60);
          const tedaviLines = doc.splitTextToSize(aiDetay.tedavi_onerileri, pageWidth - 40);
          doc.text(tedaviLines, 25, yPosition);
          yPosition += tedaviLines.length * 4 + 4;
        }
      } else {
        // Varsayılan açıklama ve öneriler
        doc.setFontSize(9);
        doc.setTextColor(60, 60, 60);
        const descLines = doc.splitTextToSize(finding.description || 'Detaylı değerlendirme için diş hekimine başvurunuz.', pageWidth - 40);
        doc.text(descLines, 25, yPosition);
        yPosition += descLines.length * 4 + 4;
      }

      // Ayırıcı
      doc.setDrawColor(220, 220, 220);
      doc.line(15, yPosition, pageWidth - 15, yPosition);
      yPosition += 10;
    });

    // ===== SON SAYFA: HASTA BİLGİLENDİRME =====
    if (report?.hasta_bilgilendirme) {
      doc.addPage();
      yPosition = 20;

      doc.setFontSize(16);
      doc.setTextColor(19, 164, 236);
      doc.text('ℹ️ Hasta Bilgilendirme', 15, yPosition);
      yPosition += 12;

      doc.setFillColor(240, 249, 255);
      doc.rect(15, yPosition - 3, pageWidth - 30, 30, 'F');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const hastaLines = doc.splitTextToSize(report.hasta_bilgilendirme, pageWidth - 40);
      doc.text(hastaLines, 20, yPosition + 5);
      yPosition += 40;

      if (report.prognoz) {
        doc.setFontSize(11);
        doc.setTextColor(34, 197, 94);
        doc.setFont(undefined, 'bold');
        doc.text('Prognoz:', 15, yPosition);
        yPosition += 6;
        doc.setFont(undefined, 'normal');
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        const prognozLines = doc.splitTextToSize(report.prognoz, pageWidth - 30);
        doc.text(prognozLines, 15, yPosition);
      }
    }

    // Alt bilgi tüm sayfalara
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `AI Dental Analysis - Gemini Destekli Rapor - Sayfa ${i} / ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        'Bu rapor yapay zeka destekli bir ön değerlendirmedir. Kesin tanı için diş hekiminize danışın.',
        pageWidth / 2,
        pageHeight - 5,
        { align: 'center' }
      );
    }

    // PDF'i indir
    const fileName = `dental-ai-report-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    console.log('PDF başarıyla indirildi:', fileName);
    
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      alert('PDF oluştururken bir hata oluştu: ' + error.message);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col bg-background-light dark:bg-background-dark group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-slate-200 dark:border-slate-800 px-6 sm:px-10 py-3 bg-white/80 dark:bg-background-dark/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="flex items-center gap-4 text-slate-900 dark:text-white">
            <div className="size-6 text-primary">
              <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor"></path>
              </svg>
            </div>
            <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
              AI Dental Analysis
            </h2>
          </div>
          <div className="flex flex-1 justify-end gap-2 sm:gap-4 items-center">
            <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-3">
              <span className="material-symbols-outlined text-lg">ios_share</span>
              <span className="hidden sm:inline">Paylaş</span>
            </button>
            <button 
              onClick={downloadPDFReport}
              disabled={isGeneratingReport}
              className={`flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-3 ${
                isGeneratingReport 
                  ? 'bg-primary/50 text-white cursor-not-allowed' 
                  : 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {isGeneratingReport ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="hidden sm:inline">AI Rapor Oluşturuluyor...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">download</span>
                  <span className="hidden sm:inline">AI Rapor İndir</span>
                </>
              )}
            </button>
            <button 
              onClick={() => navigate('/')}
              className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-3"
            >
              <span className="material-symbols-outlined text-lg">home</span>
            </button>
          </div>
        </header>

        <main className="px-4 sm:px-6 lg:px-10 flex flex-1 justify-center py-5">
          <div className="layout-content-container flex flex-col w-full max-w-screen-2xl flex-1">
            <div className="flex flex-wrap justify-between items-start gap-4 p-4">
              <div className="flex min-w-72 flex-col gap-1">
                <p className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
                  Analiz Raporu
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-normal">
                  Analiz Tarihi: {new Date().toLocaleDateString('tr-TR', { 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            {/* İstatistik Kartları */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 px-4 pb-4">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 border border-primary/20 dark:border-primary/30 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-2xl">assignment</span>
                  <p className="text-xs font-semibold uppercase text-primary tracking-wide">Toplam</p>
                </div>
                <p className="text-slate-900 dark:text-white text-3xl font-black">{stats.total}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Tespit Edilen Bulgu</p>
              </div>

              <div className="bg-gradient-to-br from-red-500/10 to-red-500/5 dark:from-red-500/20 dark:to-red-500/10 border border-red-500/20 dark:border-red-500/30 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500 text-2xl">error</span>
                  <p className="text-xs font-semibold uppercase text-red-500 tracking-wide">Yüksek Risk</p>
                </div>
                <p className="text-slate-900 dark:text-white text-3xl font-black">{stats.highRisk}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Acil Müdahale Gerekli</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 dark:from-orange-500/20 dark:to-orange-500/10 border border-orange-500/20 dark:border-orange-500/30 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-orange-500 text-2xl">warning</span>
                  <p className="text-xs font-semibold uppercase text-orange-500 tracking-wide">Orta Risk</p>
                </div>
                <p className="text-slate-900 dark:text-white text-3xl font-black">{stats.mediumRisk}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Takip Gerekli</p>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 dark:from-green-500/20 dark:to-green-500/10 border border-green-500/20 dark:border-green-500/30 rounded-xl p-4 flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-green-500 text-2xl">verified</span>
                  <p className="text-xs font-semibold uppercase text-green-500 tracking-wide">Güven Ortalaması</p>
                </div>
                <p className="text-slate-900 dark:text-white text-3xl font-black">{stats.avgConfidence}%</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">AI Güven Skoru</p>
              </div>
            </div>

            {/* Risk Uyarısı Banner */}
            {stats.highRisk > 0 && (
              <div className="mx-4 mb-4 bg-red-500/10 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-red-500 text-2xl mt-0.5">emergency</span>
                <div className="flex-1">
                  <h3 className="text-red-700 dark:text-red-400 font-bold text-sm mb-1">
                    ⚠️ Acil Dikkat Gerektiren {stats.highRisk} Bulgu Tespit Edildi
                  </h3>
                  <p className="text-red-600 dark:text-red-300 text-sm">
                    Lütfen en kısa sürede bir diş hekimi ile görüşmenizi öneririz. Bu bulgular ciddi dental problemlere işaret edebilir.
                  </p>
                </div>
              </div>
            )}

            {stats.mediumRisk > 0 && stats.highRisk === 0 && (
              <div className="mx-4 mb-4 bg-orange-500/10 border-l-4 border-orange-500 rounded-lg p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-orange-500 text-2xl mt-0.5">schedule</span>
                <div className="flex-1">
                  <h3 className="text-orange-700 dark:text-orange-400 font-bold text-sm mb-1">
                    📋 {stats.mediumRisk} Bulgu Takip Gerektiriyor
                  </h3>
                  <p className="text-orange-600 dark:text-orange-300 text-sm">
                    Bu bulgular için düzenli kontrol ve takip önerilir. Bir diş hekimi randevusu almanızı tavsiye ederiz.
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col lg:flex-row flex-1 gap-6 p-4">
              <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div 
                  ref={containerRef}
                  className="relative flex-1 min-h-[400px] overflow-hidden cursor-grab active:cursor-grabbing"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                >
                  {imageUrl && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center p-4"
                      style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                        transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                      }}
                    >
                      <div className="relative">
                        <img
                          ref={imageRef}
                          src={imageUrl}
                          alt="Dental X-ray"
                          className="max-w-full max-h-full object-contain select-none"
                          draggable="false"
                        />
                        <canvas
                          ref={canvasRef}
                          className="absolute top-0 left-0 w-full h-full pointer-events-none"
                          style={{ display: showMarkers ? 'block' : 'none' }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Zoom level indicator */}
                  {zoom > 1 && (
                    <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                      {Math.round(zoom * 100)}%
                    </div>
                  )}
                </div>
                <div className="flex justify-between gap-2 p-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex gap-1">
                    <button 
                      onClick={zoomIn}
                      disabled={zoom >= 5}
                      className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Yakınlaştır"
                    >
                      <span className="material-symbols-outlined">zoom_in</span>
                    </button>
                    <button 
                      onClick={zoomOut}
                      disabled={zoom <= 1}
                      className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Uzaklaştır"
                    >
                      <span className="material-symbols-outlined">zoom_out</span>
                    </button>
                    {zoom > 1 && (
                      <button 
                        onClick={resetZoom}
                        className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                        title="Sıfırla"
                      >
                        <span className="material-symbols-outlined">refresh</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showMarkers}
                        onChange={(e) => setShowMarkers(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-primary focus:ring-primary dark:bg-slate-800 dark:checked:bg-primary"
                      />
                      İşaretleri Göster
                    </label>
                  </div>
                </div>
              </div>

              <aside className="w-full lg:w-[420px] lg:max-w-md flex flex-col gap-6">
                <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
                      Tespit Edilen Bulgular
                    </h2>
                    <span className="bg-primary/10 dark:bg-primary/20 text-primary text-xs font-bold px-2.5 py-1 rounded-full">
                      {findings.length} Bulgu
                    </span>
                  </div>
                  
                  {/* Risk Dağılımı Grafik */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      Risk Dağılımı
                    </p>
                    <div className="space-y-2">
                      {stats.highRisk > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Yüksek Risk</span>
                              <span className="text-xs text-red-500 font-bold">{stats.highRisk}</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div 
                                className="bg-red-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${(stats.highRisk / stats.total) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}
                      {stats.mediumRisk > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Orta Risk</span>
                              <span className="text-xs text-orange-500 font-bold">{stats.mediumRisk}</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div 
                                className="bg-orange-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${(stats.mediumRisk / stats.total) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}
                      {stats.lowRisk > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="flex justify-between mb-1">
                              <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">Düşük Risk</span>
                              <span className="text-xs text-green-500 font-bold">{stats.lowRisk}</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${(stats.lowRisk / stats.total) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {findings.map((finding, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedFinding(finding)}
                        className={`w-full text-left p-3.5 rounded-lg flex items-start justify-between gap-3 transition-all duration-200 ${
                          selectedFinding === finding
                            ? 'bg-primary/20 dark:bg-primary/30 border-2 border-primary shadow-lg shadow-primary/20'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 border-2 border-transparent'
                        }`}
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                            finding.risk === 'High Risk' 
                              ? 'bg-red-500' 
                              : finding.risk === 'Medium' 
                              ? 'bg-orange-500' 
                              : 'bg-green-500'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-bold text-slate-900 dark:text-white truncate">
                              {finding.name}
                            </span>
                            <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                              {finding.location}
                            </span>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${
                                    finding.risk === 'High Risk'
                                      ? 'bg-red-500'
                                      : finding.risk === 'Medium'
                                      ? 'bg-orange-500'
                                      : 'bg-green-500'
                                  }`}
                                  style={{ width: `${finding.confidence}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                {Math.round(finding.confidence)}%
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className={`flex-shrink-0 text-xs font-semibold uppercase px-2 py-1 rounded-md ${getRiskColor(finding.risk)}`}>
                          {finding.risk === 'High Risk' ? 'Yüksek' : finding.risk === 'Medium' ? 'Orta' : 'Bilgi'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedFinding && (
                  <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    {/* Başlık Bölümü */}
                    <div className={`p-5 border-l-4 ${
                      selectedFinding.risk === 'High Risk' 
                        ? 'bg-red-50 dark:bg-red-950/20 border-red-500' 
                        : selectedFinding.risk === 'Medium' 
                        ? 'bg-orange-50 dark:bg-orange-950/20 border-orange-500' 
                        : 'bg-green-50 dark:bg-green-950/20 border-green-500'
                    }`}>
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          selectedFinding.risk === 'High Risk' 
                            ? 'bg-red-500' 
                            : selectedFinding.risk === 'Medium' 
                            ? 'bg-orange-500' 
                            : 'bg-green-500'
                        }`}>
                          <span className="material-symbols-outlined text-xl">visibility</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{
                            color: selectedFinding.risk === 'High Risk' 
                              ? 'rgb(239, 68, 68)' 
                              : selectedFinding.risk === 'Medium' 
                              ? 'rgb(249, 115, 22)' 
                              : 'rgb(34, 197, 94)'
                          }}>
                            Seçili Bulgu
                          </p>
                          <h3 className="text-slate-900 dark:text-white text-xl font-black leading-tight">
                            {selectedFinding.name}
                          </h3>
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            📍 {selectedFinding.location}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 flex flex-col gap-5">
                      {/* Güven Skoru ve Risk Seviyesi */}
                      <div className="grid grid-cols-2 gap-3">
                        {selectedFinding.confidence && (
                          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-2">
                              AI Güven Skoru
                            </p>
                            <div className="flex items-end gap-2">
                              <p className="text-2xl font-black text-slate-900 dark:text-white">
                                {Math.round(selectedFinding.confidence)}%
                              </p>
                              <span className="material-symbols-outlined text-primary mb-1">analytics</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  selectedFinding.risk === 'High Risk'
                                    ? 'bg-red-500'
                                    : selectedFinding.risk === 'Medium'
                                    ? 'bg-orange-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${selectedFinding.confidence}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                        
                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase mb-2">
                            Risk Seviyesi
                          </p>
                          <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined ${
                              selectedFinding.risk === 'High Risk' 
                                ? 'text-red-500' 
                                : selectedFinding.risk === 'Medium' 
                                ? 'text-orange-500' 
                                : 'text-green-500'
                            }`}>
                              {selectedFinding.risk === 'High Risk' 
                                ? 'error' 
                                : selectedFinding.risk === 'Medium' 
                                ? 'warning' 
                                : 'check_circle'}
                            </span>
                            <p className={`text-lg font-black ${
                              selectedFinding.risk === 'High Risk' 
                                ? 'text-red-500' 
                                : selectedFinding.risk === 'Medium' 
                                ? 'text-orange-500' 
                                : 'text-green-500'
                            }`}>
                              {getRiskText(selectedFinding.risk)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Açıklama */}
                      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-xl">info</span>
                          <h4 className="text-sm font-bold text-blue-900 dark:text-blue-200">
                            AI Bulgu Açıklaması
                          </h4>
                        </div>
                        <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                          {selectedFinding.description}
                        </p>
                      </div>

                      {/* Öneriler */}
                      <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-xl">medical_services</span>
                          <h4 className="text-sm font-bold text-purple-900 dark:text-purple-200">
                            Klinik Öneriler
                          </h4>
                        </div>
                        <p className="text-sm text-purple-800 dark:text-purple-300 leading-relaxed">
                          {selectedFinding.recommendations}
                        </p>
                      </div>

                      {/* Uyarı Mesajı */}
                      {selectedFinding.risk === 'High Risk' && (
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-lg">emergency</span>
                            <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                              <strong>Önemli:</strong> Bu bulgu acil diş hekimi müdahalesi gerektirebilir. 
                              Lütfen en kısa sürede profesyonel değerlendirme için randevu alın.
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedFinding.risk === 'Medium' && (
                        <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <span className="material-symbols-outlined text-orange-600 dark:text-orange-400 text-lg">schedule</span>
                            <p className="text-xs text-orange-700 dark:text-orange-300 leading-relaxed">
                              <strong>Öneri:</strong> Bu bulgu için düzenli takip önerilir. 
                              Bir diş hekimi randevusu almanız faydalı olacaktır.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
