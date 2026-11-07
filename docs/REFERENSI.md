# Rujukan Ilmiah: OCR & Transliterasi Aksara Bali

Dikumpulkan lewat OpenAlex (7 Nov 2026). Judul, penulis, dan DOI dari katalog; isi makalah belum dibaca penuh,
jadi catatan "relevansi" adalah kesimpulan dari judul dan perlu diverifikasi sebelum dikutip.

## Dataset & kompetisi
- Kesiman, Burie, Wibawantara. *AMADI_LontarSet: The First Handwritten Balinese Palm Leaf Manuscripts Dataset.* ICFHR 2016. https://doi.org/10.1109/icfhr.2016.0042
  Relevansi: dataset lontar Bali beranotasi, calon bahan evaluasi/pelatihan (cek lisensi dulu).
- Burie, Coustaty, Setiawan, dkk. *ICFHR2016 Competition on the Analysis of Handwritten Text in Images of Balinese Palm Leaf Manuscripts.* https://doi.org/10.1109/icfhr.2016.0114
  Relevansi: tolok ukur binarisasi, segmentasi baris, dan pengenalan glif.

## Segmentasi & pengenalan (dokumen lontar)
- Kesiman, Burie, Ogier. *A New Scheme for Text Line and Character Segmentation from Gray Scale Images of Palm Leaf Manuscript.* ICFHR 2016. https://doi.org/10.1109/icfhr.2016.63
  Relevansi: dasar fitur "Bagi per Baris" (profil proyeksi + segmentasi baris pada citra lontar).
- Kesiman, Prum, Burie, dkk. *Study on feature extraction methods for character recognition of Balinese script on palm leaf manuscript images.* ICPR 2016. https://doi.org/10.1109/icpr.2016.7900262
- Kesiman, Burie, Ogier. *A Complete Scheme of Spatially Categorized Glyph Recognition for the Transliteration of Balinese Palm Leaf Manuscripts.* ICDAR 2017. https://doi.org/10.1109/icdar.2017.29
- Kesiman. *Word Recognition for the Balinese Palm Leaf Manuscripts.* CyberneticsCom 2019. https://doi.org/10.1109/cyberneticscom.2019.8875634
- Kesiman, Dermawan. *AKSALont: Automatic transliteration application for Balinese palm leaf manuscripts with LSTM Model.* Jurnal Teknologi dan Sistem Komputer, 2021. https://doi.org/10.14710/jtsiskom.2021.13969
- Kesiman, Pradnyana. *A Scheme Towards Automatic Word Indexation System for Balinese Palm Leaf Manuscripts.* J. ICT Research and Applications, 2021. https://doi.org/10.5614/itbj.ict.res.appl.2021.15.2.1
- Kesiman, Maysanjaya. *A model for post-transliteration suggestion for Balinese palm leaf manuscript with text generation and LSTM model.* J. Phys.: Conf. Ser., 2021. https://doi.org/10.1088/1742-6596/1810/1/012011
- Pratama, Sulistiyo, Ihsan. *Balinese Script Handwriting Recognition Using Faster R-CNN.* Jurnal RESTI, 2023. https://doi.org/10.29207/resti.v7i6.5176
- Imawati, Sudarma, Putra. *Customizing VGGNet Layers for Balinese Script Lontar Character Recognition.* ICSGTEIS 2025. https://doi.org/10.1109/icsgteis68532.2025.11284394
- Sutramiani, Darma, Arsa. *Handwritten Balinese Script Recognition on Palm Leaf Manuscript using Projection Profile and K-Nearest Neighbor.* Jurnal Ilmiah Merpati, 2022. https://doi.org/10.24843/jim.2022.v10.i03.p02
- Indrawan, Asroni, Dewi. *Balinese Script Recognition Using Tesseract Mobile Framework.* Lontar Komputer, 2022. https://doi.org/10.24843/lkjiti.2022.v13.i03.p03
- Thuon, Du, Theang. *PALM-LAY: A Multi-script Cross-Regional Dataset for Layout Analysis of Palm Leaf Manuscripts.* LNCS, 2026. https://doi.org/10.1007/978-3-032-09371-4_15

## Transliterasi Latin -> aksara Bali (aturan)
- Kesiman, Burie, Ogier. *Knowledge Representation and Phonological Rules for the Automatic Transliteration of Balinese Script on Palm Leaf Manuscript.* Computación y Sistemas 21(4), 2018. https://doi.org/10.13053/cys-21-4-2851
  Relevansi: aturan fonologis untuk meninjau ulang `lib/aksara.ts`.
- Jampel, Indrawan, Widiana. *Accuracy Analysis of Latin-to-Balinese Script Transliteration Method.* IJECE 8(3), 2018. https://doi.org/10.11591/ijece.v8i3.pp1788-1797
- Indrawan, Paramarta, Agustini. *Latin-to-Balinese Script Transliteration Method on Mobile Application: A Comparison.* IJEECS 10(3), 2018. https://doi.org/10.11591/ijeecs.v10.i3.pp1331-1342
- Indrawan, Puspita, Paramarta. *LBtrans-Bot: A Latin-to-Balinese Script Transliteration Robotic System based on Noto Sans Balinese Font.* IJEECS 12(3), 2018. https://doi.org/10.11591/ijeecs.v12.i3.pp1247-1256
- Loekito, Indrawan, Sariyasa. *Error Analysis of Latin-to-Balinese Script Transliteration Method Based on Noto Sans Balinese Font.* ICIRAD 2020. https://doi.org/10.2991/assehr.k.200115.055
- Indrawan, Gunadi, Gitakarma. *Latin to Balinese Script Transliteration: Lessons Learned from the Computer-based Implementation.* ICSIM 2021. https://doi.org/10.1145/3451471.3451499
- Suryanto, Widiarti, Suparwito. *Balinese script transliteration: A preliminary study.* AIP Conf. Proc., 2024. https://doi.org/10.1063/5.0211269
- Hinzler. *Balinese palm-leaf manuscripts.* BKI 149(3), 1993. https://doi.org/10.1163/22134379-90003116 (latar budaya/fisik lontar)

## Tindak lanjut yang disarankan
1. Bandingkan aturan `lib/aksara.ts` dengan makalah Kesiman (2018) dan Indrawan (2018, 2021) dan catat selisihnya.
2. Minta izin/akses AMADI_LontarSet untuk evaluasi segmentasi baris dan (kelak) melatih pengenal glif.
3. Pengenal otomatis: model baris-ke-teks (mis. TrOCR/CRNN) dilatih dari transkripsi terverifikasi; Readbali memakai pendekatan serupa.
