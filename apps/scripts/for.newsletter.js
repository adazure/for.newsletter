/*
 Adazure Interactive
 For-Newsletter Version 1.0
 test.adazure.com/project/For-Newsletter/v1/For-Newsletter.html    
 www.adazure.com
 
 Bu ve bunun gibi bir çok plugin çalışmasına www.adazure.com/project/ adresinden ulaşabilirsiniz. Plugin'i dilediğiniz gibi değiştirebilir, geliştirebilirsiniz.
 Pluginler ile ilgili görüş ve önerilerini www.adazure.com/feed/ veya hello@adazure.com e-posta adresi üzerinden bildirim yapabilirsiniz.
 Tavsiyeleriniz için teşekkürler.
*/


(function () {

    //Modele ait sınıf içerisinde aranacak benzersiz kelimemiz
    var _modelClassName = 'for-newsletter';

    function _model(data) {

        //Geliştiri tarafından bildirilecek ayar değerleri nesnesi
        var setting = data.getAttribute('for-setting');

        //Nesneye ait bir ID(kimlik) veya name(isim) değeri
        var idname = data.name ? data.name : data.id;

        //Post işlemi için kullanılacak request nesnesi
        var http = new XMLHttpRequest();

        //Timeout işlemi için kullanılacak
        var timer = 0;

        //Varsayılan olarak atanmış olan ve geliştiriciden gelen verileri de burada taşıyacağımız nesnemiz.
        var settingDefault = {
            success: 'E-posta adresiniz kaydedilmiştir. Teşekkür ederiz',
            invalid: 'Geçersiz e-posta adresi',
            timeout: 'Bağlantı zaman aşımına uğradı. Daha sonra tekrar deneyiniz',
            wait: 'İşlem yapılıyor lütfen bekleyin!',
            click:null,
            timeoutdelay: 0,
            messagedelay: 5000,
            url:null,
            protocols:((location.protocol == 'http:' || location.protocol == 'https:') ? true : (location.hostname == 'localhost' ? true : false)),

        }

        //Geliştiriden gelen ayar nesnesi varsa
        if (setting) {
            //Tanımlanan nesneyi akıllı nesneye çevir
            setting = eval(setting);

            //Nesne içerisinde belirtilen alanları, varsayılan nesnemiz içerisinde ara ve eşleşenleri, eğer içleri doluyla birleştirir
            for (var i in setting) {
                if (settingDefault.hasOwnProperty(i)) {
                    if(setting[i])
                    settingDefault[i] = setting[i];
                }
            }

        }
            //Eğer geliştirici tarafından bir nesne belirtilmediyse, ilgili input nesnesinin özelliklerinde belirtilen alanlar var mı kontrol ediyoruz
            //Var olan ilgili alanları alıp içleri doluysa varsayılan nesnesine aktarıyoruz
        else {

            var n = ['success', 'wait', 'invalid', 'timeout', 'timeoutdelay', 'messagedelay', 'url','click'];
            for (var i = 0; i < n.length; i++) {
                var e = data.getAttribute('for-' + n[i]);
                if(e)
                    settingDefault[n[i]] = e;
            }

        }

        //Input nesnesi içersine yapılacak her bir işlem önce ve sonrası için kullanıcıya gösterilecek mesajlar için bir nesne oluşturuyoruz
        //Birinci nesne ana nesne, input nesnemizin bulunduğu yere ekleniyor ve height değeri 0 yani yer kaplamasını istemiyoruz. CSS tarafında belirtik.
        //ikinci nesne birinci nesne içerisinde bulunacak ve mesajları göstereceğimiz nesne.
        var waitObject = document.createElement('div');
        var waitObjectText = document.createElement('div');

        //Oluşturulan nesnelere ilgili sınıf ve atamaları yapıyoruz
        waitObject.className = 'for-newsletter-wait';
        waitObject.appendChild(waitObjectText);

        //Nesneyi input nesnesinin yanına oluşturur
        data.parentNode.appendChild(waitObject);

        //Mesaj uyarıları yapıldıktan sonra gizlemek için kullanılacak method
        waitObjectText.hideMessage = function () {
            var _ = this;
            setTimeout(function () {
                _.style.display = 'none';
            }, settingDefault.messagedelay);
        }

        //Mesaj uyarılarının gösterilmesini sağlayan method
        waitObjectText.showMessage = function (text, type) {
            switch (type) {
                case 'wait':
                    this.innerHTML = text;
                    this.className = 'status-wait';
                    break;
                case 'invalid':
                    this.innerHTML = text;
                    this.className = 'status-invalid';
                    break;
                case 'success':
                    this.innerHTML = text;
                    this.className = 'status-success';
                    break;
            }

            this.style.display = 'block';

        }

        //Geliştirici tarafından input nesnesine bir name veya ID özelliği belirtilmediyse işlemi sonlandırıp uyarı veriyoruz.
        //Böylece geliştiricinin dikkat dağınıklığını azamiye indiriyoruz
        if (!idname) {
            waitObjectText.showMessage('Input nesnesine ait <b>name</b> veya <b>ID</b> özelliği bulunmuyor', 'invalid');
            return;
        }

        //Aynı şekilde url özelliği de geliştirici tarafından belirtilmemiş olabilir bunun içinde başlangıçta uyarı veriyoruz.
        if (!settingDefault.url) {
            waitObjectText.showMessage('Post işlemi için bir <b>url</b> tanımlı değil', 'invalid');
            return;
        }

        //Eğer tıklama esnasında gönderim yapılmak isteniyorsa, geliştiriden gelen buton ID değeriyle etkileşimde bulunalım
        if(settingDefault.click)
            _bind(document.getElementById(settingDefault.click),'click',httpPost);

        //Geliştirici tarafından post işleminin belli bir zaman dilimi içerisinde yapılması istenmişse, 
        //bu sürenin kontrolünü sağlayıp işlemin iptal edilmesini sağlayan method
        function httpTimeout() {
            if (settingDefault.timeoutdelay > 0 && http != null) {
                timer = setTimeout(function () {
                    http.abort();
                    waitObjectText.showMessage(settingDefault.timeout, 'invalid');
                    waitObjectText.hideMessage(settingDefault.messagedelay);
                }, settingDefault.timeoutdelay);
            }
        }

        //Gönderim işlemi bu alanda yapılıyor
        function httpPost(){

                if (data.value && checkEmail(data.value)) {

                    //İşlem yapılma esnasında eğer belirli bir http protokolu ile gönderilmiyorsa uyarı verelim.
                    //Bu kontrolü koymadığımızda geliştirici sorunu başlangıçta anlamayabilir, tarayıcıların geliştirici paneline bakana kadar ki süreyi kısaltmış oluyoruz.
                    //Bunun dışında ki, crossdomain uyarıları; yani server tarafında eğer bir engel varsa bu error methoduna sürecektir veya geliştirici ekranında belirecektir.
                    if (!settingDefault.protocols) {
                        waitObjectText.showMessage('(Crossdomain) Sadece <b>localhost</b> veya <b>http/https</b> gibi protokollerden işlemi gerçekleştirebilirsiniz.', 'invalid');
                        return;
                    }

                    //Kullanıcı için kayıt esnasında bekleyin uyarısı yapıyoruz
                    waitObjectText.showMessage(settingDefault.wait, 'wait');
                    data.setAttribute('disabled', 'disabled');

                    try {

                        //Gönderilme esnasında ki kontrolller
                        http.onreadystatechange = function () {
                            if (http.readyState == 4) {

                                //İlgili URL'ye ulaşılmışsa işlem başarılı kabul edilmektedir.
                                //Burada dikkat edilmesi gereken bir konu, sayfaya ulaşıldı ancak sonuç olumsuz olabilir.
                                //Bu yüzden post işlemi yapılan URL den eğer bir veri gelmişse yani dönen değer true/false 1/0 şeklinde olmalıdır.
                                if (http.status == 200) {


                                    //Özel mesaj bildirimi
                                    if(settingDefault.customresult){

                                        var result = JSON.parse(http.responseText);
                                        waitObjectText.showMessage(result.value, result.state == 1 ? 'success' : 'invalid');

                                    }else{

                                        if(http.responseText == true)
                                        waitObjectText.showMessage(settingDefault.success, 'success');
                                        else
                                        waitObjectText.showMessage(settingDefault.invalid, 'invalid');

                                    }

                                    

                                    data.value = '';
                                }
                                //Sayfaya ulaşılamıyorsa
                                else if (http.status == 404) {
                                    waitObjectText.showMessage('URL <b>' + settingDefault.url + '</b> not found', 'invalid');
                                }
                                //Bunların dışında oluşabilecek diğer durumlar için
                                else {
                                    waitObjectText.showMessage(http.responseText ? http.responseText : settingDefault.invalid, 'invalid');
                                }

                                data.removeAttribute('disabled');
                                waitObjectText.hideMessage();

                                //çalıştırılmış bir timeout varsa temizleyelim
                                clearTimeout(timer);

                            }
                        };

                        //Post işlemlerini yapıyoruz
                        //Öncesinde timeout methodunu çalıştırıp, kontrolleri yapıyoruz. Varsa istenen timeout işlemi çalıştırıyoruz
                        httpTimeout();
                        http.open("POST", settingDefault.url, true);
                        http.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                        http.send((data.id ? data.id : data.name) + "=" + data.value);


                    }
                    //Post işlemi sırasında herhangi bir hata oluştu. Bunu mesaj ekranına yansıtıyoruz
                    catch (error) {

                        waitObjectText.showMessage(error, 'invalid');
                        data.removeAttribute('disabled');
                        waitObjectText.hideMessage();
                    }

                }
                    //Girilen e-posta bilgisi geçersiz
                else {

                    waitObjectText.showMessage(settingDefault.invalid, 'invalid');
                    data.removeAttribute('disabled');
                    waitObjectText.hideMessage();
                }            

        }

        //input nesnesine klavyeden bir tuşa basıldığında işlem yapmasını  istiyoruz
        //Buradaki tek amacımız elbetteki enter tuşuna başılması esnasında olacak.
        _bind(data, 'keyup', function (e) {

            var keycode = e.keyCode || e.which;

            //Eğer enter tuşuna basılmışsa
            if (keycode == 13) {

                //Eğer input değeri doluysa ve geçerli bir e-posta adresiyse işleme devam ediliyor
                
                httpPost();

            }


        })

    }

    function _init() {

        var el = document.getElementsByClassName(_modelClassName);
        for (var o = 0; o < el.length; o++) {
            new _model(el[o]);
        }

    }

    function checkEmail(e) {
        return /^[a-z]+([0-9]*|[\.\_\-]{0,1})+[a-z]+[0-9]*[^\.:;]@[a-z]+([0-9]*|[\_\-]{0,1})+(\.[a-z]{2,3}){1,2}$/.test(e);
    }

    function _bind(obj, name, method) {
        if (obj.addEventListener)
            obj.addEventListener(name, method, false);
        else
            obj.attachEvent('on' + name, method);
    }

    _bind(window, 'load', _init);

})();