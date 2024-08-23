let selectedCoinCa, _solanaWeb3

const connectWallet = async () => {
    try {
        _solanaWeb3 = window.solana;

        // Request connection to the Phantom wallet
        await _solanaWeb3.connect();
        console.log('Connected to Solana wallet');
    } catch (err) {
        console.error('Error connecting to Solana wallet:', err);
    }
};

jQuery(document).ready(function ($) {

    $(".check-ca-btn")[0].addEventListener("click", function () {
        var modal = document.querySelector(".modal-checkCA")

        $('.modal-cover')[0].style.display = "block"
        modal.style.visibility = "visible";
        modal.style.opacity = "1";
        modal.style.display = "flex";
        // setTimeout(() => {
        //     modal.style.backdropFilter = "blur(6px)";
        // }, 700)

        currentOpacity = 1;
    });

    $(".lock-sol-btn")[0].addEventListener("click", function () {
        var modal = document.querySelector(".modal-guardCA")

        $('.modal-cover')[0].style.display = "block"
        modal.style.visibility = "visible";
        modal.style.opacity = "1";
        modal.style.display = "flex";
        // setTimeout(() => {
        //     modal.style.backdropFilter = "blur(6px)";
        // }, 700)

        currentOpacity = 1;
    });

    $(".refund-coin-btn")[0].addEventListener("click", function () {
        var modal = document.querySelector(".modal-refundCA")

        $('.modal-cover')[0].style.display = "block"
        modal.style.visibility = "visible";
        modal.style.opacity = "1";
        modal.style.display = "flex";
        // setTimeout(() => {
        //     modal.style.backdropFilter = "blur(6px)";
        // }, 700)

        currentOpacity = 1;
    });

    $(".check-state-mod")[0].addEventListener("click", function () {
        var modal = document.querySelector(".modal-checkStateCA")

        $('.modal-cover')[0].style.display = "block"
        modal.style.visibility = "visible";
        modal.style.opacity = "1";
        modal.style.display = "flex";
        // setTimeout(() => {
        //     modal.style.backdropFilter = "blur(6px)";
        // }, 700)

        currentOpacity = 1;
        fetchRecentlyRefunded()
    });

    $(".dev-refund-b")[0].addEventListener("click", function () {
        var modal = document.querySelector(".modal-devrefund")

        $('.modal-cover')[0].style.display = "block"
        modal.style.visibility = "visible";
        modal.style.opacity = "1";
        modal.style.display = "flex";
        // setTimeout(() => {
        //     modal.style.backdropFilter = "blur(6px)";
        // }, 700)

        currentOpacity = 1;
    });

    $(".modal__close")[0].addEventListener("click", function () {
        var modal = $(".modal")[0]

        $('.modal-cover')[0].style.display = "none"
        modal.style.visibility = "invisible";
        modal.style.display = "none";
        modal.style.opacity = 0;
    });

    $(".modal__close")[1].addEventListener("click", function () {
        var modal = $(".modal")[1]

        $('.modal-cover')[0].style.display = "none"
        modal.style.visibility = "invisible";
        modal.style.display = "none";
        modal.style.opacity = 0;
    });

    $(".modal__close")[2].addEventListener("click", function () {
        var modal = $(".modal")[2]

        $('.modal-cover')[0].style.display = "none"
        modal.style.visibility = "invisible";
        modal.style.display = "none";
        modal.style.opacity = 0;
    });

    $(".modal__close")[3].addEventListener("click", function () {
        var modal = $(".modal")[3]

        $('.modal-cover')[0].style.display = "none"
        modal.style.visibility = "invisible";
        modal.style.display = "none";
        modal.style.opacity = 0;
    });

    $(".modal__close")[4].addEventListener("click", function () {
        var modal = $(".modal")[4]

        $('.modal-cover')[0].style.display = "none"
        modal.style.visibility = "invisible";
        modal.style.display = "none";
        modal.style.opacity = 0;
    });

    getTopPumpfunCoins()
    setInterval(() => {
        getTopPumpfunCoins()
    }, 1000 * 30)
})






//toast
// Setup
var notification = new Notif({
    topPos: 10,
    classNames: 'success danger',
    autoClose: false,
    autoCloseTimeout: 3000
});



function Notif(option) {
    var el = this;

    el.self = $('.toast-message');
    el.close = this.self.find('.close');
    el.message = el.self.find('.message');
    //  el.top = option.topPos;
    el.classNames = option.classNames;
    el.autoClose = (typeof option.autoClose === "boolean") ? option.autoClose : false;
    el.autoCloseTimeout = (option.autoClose && typeof option.autoCloseTimeout === "number") ? option.autoCloseTimeout :
        3000;


    // Methods
    el.reset = function () {
        el.message.empty();
        el.self.removeClass(el.classNames);
    }
    el.show = function (msg, type) {
        el.reset();
        el.self.css('top', el.top);
        el.message.text(msg);
        el.self.addClass(type);

        if (el.autoClose) {
            setTimeout(function () {
                el.hide();
            }, el.autoCloseTimeout);
        }
    }
    el.hide = function () {
        // el.self.css('top', '-100%');
        // el.reset();
        $('.toast-message')[0].style.display = "none"
    };

    el.close.on('click', this.hide);

}



setTimeout(() => {
    $('.toast-message')[0].style.display = "block"
}, 6500)






async function updateLockedBalance() {
    const response = await fetch('https://pumpguard.fun/update_lock_address_balance', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            ca: selectedCoinCa
        }),
    });
    const data = await response.json();

    if (typeof data.balance == "number") {
        $('.dt-lock-2')[0].innerHTML = (data.balance / 1e9).toFixed(3) + " Solana"
    }
}



async function getTopPumpfunCoins() {

    const response = await fetch('https://pumpguard.fun/get_all_coins', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
    });

    const data = await response.json();
    console.log(data)

    renderCoins(data.topCoins, $('.top-coins-wr')[0])
    renderCoins(data.topGuarded, $('.top-guarded-coins-wr')[0])
    renderCoins(data.recentlyGuarded, $('.new-guarded-coins-wr')[0])
}

function renderCoins(data, wrapperEl) {
    let maxProgressMKC = 409 // sol

    let tBody = ""

    for (var i = 0; i < data.length; i++) {

        let inf_web = "/"
        let inf_tg = "/"
        let inf_x = "/"

        let inf_web_op = 0.3
        let inf_tg_op = 0.3
        let inf_x_op = 0.3

        
        if (data[i].website) {
            inf_web = data[i].website
            inf_web_op = 1
        }
        if (data[i].twitter) {
            inf_x = data[i].twitter
            inf_x_op = 1
        }
        if (data[i].telegram) {
            inf_tg = data[i].telegram
            inf_tg_op = 1
        }

        let progress = data[i].market_cap * 100 / maxProgressMKC
        if (progress > 100) progress = 100

        let lockedSol = data[i].lockedSol || 0
        lockedSol = (lockedSol / 1e9).toFixed(4)

        let lockedSolColor = "#ea4e6fd9"
        if (lockedSol > 0) lockedSolColor = "#548662"

        let holders = "--"
        if (data[i].holders) holders = data[i].holders

        tBody += `
        <div style="overflow: auto; display: block;" class="+ scroll1">
            <div
                style="/* display:inline-block; */margin: 5px;box-shadow: rgb(0 0 0 / 15%) 2px 2px 9px;width: auto;margin-bottom: 10px;background: #0f111380;">
                <div class="UI-ww6 card flex space-x-3"
                    style="/* height: 120px; */padding: 0;border: 2px solid rgb(121 131 153 / 15%);border-radius: 7px;color: rgb(0 0 0 / 83%);flex-direction: column;min-width: 1px;overflow-wrap: break-word;position: relative;display: flex;backdrop-filter: blur(2px);">
                    <div class="flex-1 space-y-2" style=" flex: 1 1 0%; display: block; ">
                        <div class="w2" style="display: flex;width: 100%;justify-content: space-between;">
                            <div style=" display: flex; "><img
                                     src="https://pumpguard.fun/imgs/ico_${data[i].mint}.jpg"
                                    style="width: 50px;height: 50px;margin: 6px 0px 0px 6px;border-radius: 7px;">
                                <div style=" margin: 0px 10px; text-align: left; ">
                                    <div style="     display: flex;     position: absolute; ">
                                        <p style="color: #f0f8ffb5;margin: 6px 0px 0px 0px;font-size: 16px;font-weight: 700;">
                                             ${data[i].name} [${data[i].symbol}]</p>
                                             <svg class="HW-name-copy"
                                            onclick="copyToClipboard('${data[i].mint}')"
                                            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"
                                            style="width: 13px;fill: #cfcfcf7a;margin-left: 9px;margin-top: 2px;cursor: pointer;display: inline-block;">
                                            <path
                                                d="M208 0H332.1c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9V336c0 26.5-21.5 48-48 48H208c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zM48 128h80v64H64V448H256V416h64v48c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V176c0-26.5 21.5-48 48-48z">
                                            </path>
                                        </svg>
                                    </div>
                                    <p style="color: #f0f8ffb5;margin: 36px 0px 0px 0px;font-size: 13px;">MKC: <span
                                            style=" font-weight: 700; ">$${lgNUM(data[i].usd_market_cap, 1)}</span></p>
                                </div>
                            </div>
                            <div style="/* margin: 0px 10px; */text-align: left;/* width: 100%; */">
                                <p style="color: #f0f8ffb5;margin: 36px 0px 0px 0px;font-size: 13px;">Vol.1h: <span
                                        style=" font-weight: 700; ">$${lgNUM(data[i].usd_market_cap, 1)}</span></p>
                            </div>
                            <div style="margin: 0px 9px;margin-top: 8px;/* position: absolute; */right: 0px;">
                                <div class="btn-3"
                                    style="color: #e7fff4c4;font-size: 12px;padding: 1px 17px;border: 1.5px solid #54866a;border-radius: 6px;cursor: pointer;display: flex;align-items: center;justify-content: center;background-color: #536c5929;margin-top: 1px;">
                                    Buy on BullX</div>
                                <div class="btn-3"
                                    style="color: #e7fff4c4;font-size: 12px;padding: 1px 10px;border: 1.5px solid #54866a;border-radius: 6px;cursor: pointer;display: flex;align-items: center;justify-content: center;background-color: #536c5929;margin-top: 7px;">
                                    Buy on Trojan</div>
                            </div>
                        </div>
                        <div style="display: flex;justify-content: space-between;padding: 0px 4px 0px 1px;margin-top: 5px;">
                            <div
                                style="text-align: left;opacity: 0.9;margin-top: 4px;height: 16px;/* width: 15%; */scale: 0.9;">
                                <a href="${inf_web}" target="_blank" style="opacity:${inf_web_op}"> <img src="./src/ic-web.svg"
                                        style="filter: invert(0.8);height: 17px;cursor: pointer;{inf_web_op}"> </a><a href="${inf_tg}"
                                    target="_blank" style="opacity:${inf_tg_op}"> <img src="./src/ic-tg.svg"
                                        style="filter: invert(0.8);width: 18px;height: 18px;margin-left: 3px;cursor: pointer;{inf_tg_op}">
                                </a><a href="${inf_x}" target="_blank" style="opacity:${inf_x_op}"> <img src="./src/ic-x.svg"
                                        style="filter: invert(0.8);width: 16px;height: 16px;margin-left: 3px;cursor: pointer;{inf_x_op}color: antiquewhite;">
                                </a></div>
                            <p class=" title-p4"
                                style="font-size: 16px;color: #f0f8ffb5;text-align: center;margin-bottom: 0px;margin-top: 1px;padding-right: 7.5%;">
                                Guarded by <span class="guarded-by-sol" style="color: ${lockedSolColor};font-weight: 900;font-size: 13px;">${lockedSol} SOL</span></p>
                            <div style="     display: flex; ">
                                <div style="     display: flex;     margin-left: 10px; "><svg xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 256 256" style="     width: 19px;     filter: invert(0.75); ">
                                        <rect width="256" height="256" fill="none"></rect>
                                        <circle cx="88" cy="108" r="52" opacity="0.2"></circle>
                                        <circle cx="88" cy="108" r="52" fill="none" stroke="#000" stroke-miterlimit="10"
                                            stroke-width="16"></circle>
                                        <path d="M155.4,57.9A54.5,54.5,0,0,1,169.5,56a52,52,0,0,1,0,104" fill="none"
                                            stroke="#000" stroke-linecap="round" stroke-linejoin="round" stroke-width="16">
                                        </path>
                                        <path d="M16,197.4a88,88,0,0,1,144,0" fill="none" stroke="#000" stroke-linecap="round"
                                            stroke-linejoin="round" stroke-width="16"></path>
                                        <path d="M169.5,160a87.9,87.9,0,0,1,72,37.4" fill="none" stroke="#000"
                                            stroke-linecap="round" stroke-linejoin="round" stroke-width="16"></path>
                                    </svg>
                                    <p
                                        style="     color: #f0f8ffb5;     font-size: 13px;     padding-left: 3px;     font-weight: 700;     margin: 5px 0px; ">
                                        ${holders}</p>
                                </div>
                                <div style="     display: flex;     margin-left: 10px; "><svg xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 24 24" fill="none" style="     width: 17px;     filter: invert(0.71); ">
                                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"
                                            stroke-width="2"
                                            d="M8 18.72C6.339 20.134 4.82 21 2 21c1-1 2.27-2.35 2.801-4.447C3.067 15.114 2 13.157 2 11c0-4.418 4.477-8 10-8 5.1 0 9.308 3.054 9.923 7"
                                            style="     color: rgb(0 0 0 / 83%); "></path>
                                        <path fill="currentColor" stroke="currentColor" stroke-linecap="round"
                                            stroke-linejoin="round" stroke-width="2"
                                            d="M16 19.889c-3.314 0-6-1.99-6-4.445C10 12.99 12.686 11 16 11s6 1.99 6 4.444c0 1.199-.64 2.286-1.68 3.085.317 1.165 1.08 1.915 1.68 2.471-1.8 0-2.716-.544-3.792-1.422-.684.2-1.428.31-2.208.31z">
                                        </path>
                                    </svg>
                                    <p
                                        style="     color: #f0f8ffb5;     font-size: 13px;     padding-left: 3px;     font-weight: 700;     margin: 5px 0px; ">
                                        ${data[i].reply_count}</p>
                                </div>
                                <div style="     display: flex;     margin-left: 10px;     margin-right: 4px; "><svg
                                        xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"
                                        style="     width: 14.5px;     filter: invert(0.65); ">
                                        <path
                                            d="M464 256A208 208 0 1 1 48 256a208 208 0 1 1 416 0zM0 256a256 256 0 1 0 512 0A256 256 0 1 0 0 256zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z">
                                        </path>
                                    </svg>
                                    <p
                                        style="     color: #f0f8ffb5;     font-size: 13px;     padding-left: 4px;     font-weight: 700;     margin: 5px 0px; ">
                                        ${timeDifference(Date.now(), data[i].created_timestamp)}</p>
                                </div>
                            </div>
                        </div>
                        <div style=" /* background: #37414c; */ /* border-top: 2px solid gray; */ ">
                            <div
                                style="color: aliceblue;font-size: 12px;/* background: #9eb8cf0f; */height: 7px;line-height: 25px;box-shadow: inset 0 0 10px rgb(249 249 249 / 7%);padding-top: 2px;">
                                <div
                                    style=" background: #78a77a; height: 7px; /* margin-top: 1px; */ width: ${progress}%; border-bottom-left-radius: 4.5px; ">
                                </div>
                                <p
                                    style="position: absolute;bottom: 2px;right: 2px;padding: 0;margin: 0;height: 15px;font-size: 11px;font-weight: 900;color: #f0f8ff8a;">
                                    ${progress.toFixed(1)}%</p>
                            </div>
                            <div></div>
                            <div></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        `
    }
    wrapperEl.innerHTML = tBody

}



async function checkIfCoinGuarded() {
    const _ca = $('.ca-check-inp')[0].value
    selectedCoinCa = _ca

    const response = await fetch('https://pumpguard.fun/is_coin_guarded', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ca: _ca
        }),
    });

    if (response.ok) {
        const data = await response.json()
        console.log(data)


        if (data.isGuarded) {
            let _actualText

            if (data.DBdata.hasMigrated) {
                _actualText =
                    `<div style="display: flex;text-align: center;place-content: space-around;"><p style="color: #6bac77f0;margin: 19px 0px 0px 0px;font-size: 22px;font-weight: 700;">Was Guarded with <span style="font-size: 24px;padding: 0px 3px;filter: drop-shadow(0px 0px 4px #6bac77f0);">${(data.DBdata.balance_allTimeHight / 1e9).toFixed(3)}</span> Solana And Has Successfully Migrated!</p></div>`
            } else {
                _actualText =
                    `<div style="display: flex;text-align: center;place-content: space-around;"><p style="color: #6bac77f0;margin: 19px 0px 0px 0px;font-size: 22px;font-weight: 700;">Is Guarded with <span style="font-size: 24px;padding: 0px 3px;filter: drop-shadow(0px 0px 4px #6bac77f0);">${(data.DBdata.balance / 1e9).toFixed(3)}</span> Solana!</p></div>
                    
                    <div style="display: flex;text-align: center;place-content: space-around;"><p style="color: #ffffffbf;margin: 0px 0px 0px 0px;font-size: 17px;font-weight: 500;">As anti-rug assurance. Invest with peace of mind.</p>`
            }

            $('.check-wr')[0].innerHTML = `

            <div class="el dots d-none"> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i> <i></i></div>
            
            <img src="./src/radial2.png" style="position: absolute; width: 600px; height: 600px;left: calc(50% - 300px);top: 80px;opacity: 0.25;z-index: 0;">

            <div style="z-index: 1;position: relative;"><div style="display: flex;text-align: center;place-content: space-around;margin-top: 30px;"><div style=" "><img src="https://pumpguard.fun/imgs/ico_${data.coinData.mint}.jpg" style="width: 90px;height: 90px;margin: 6px 0px 0px 6px;border-radius: 7px;"><div style="margin: 0px 10px;text-align: left;width: auto;">
            <p style="color: #f0f8ffe8;margin: 0px 0px 0px 0px;font-size: 18px;font-weight: 700;">
            ${data.coinData.name} [${data.coinData.symbol}]</p>
                    
            <p style="color: #f0f8ffa3;margin: 0px 0px 0px 0px;font-size: 16px;font-weight: 500;text-align: center;">${data.coinData.mint.slice(0, 6) + "...." + data.coinData.mint.slice(data.coinData.mint.length - 6,
                10000)}</p></div></div> </div>
            
            ${_actualText}
            
                
            </div><div style="display: flex;text-align: center;place-content: space-around;margin-top: 30px;"><p style="color: #ffffff5e;margin: 0px 0px 0px 0px;font-size: 15px;font-weight: 500;">Guard Vault: <a style="color: #ffffff5e" target="_blank" href="https://solscan.io/account/${data.DBdata.lockAddress}">${data.DBdata.lockAddress}</a></p>
                
            </div><div style="display: flex;text-align: center;place-content: space-around;"><p style="color: #f0f8ff17;margin: 0px 0px 0px 0px;font-size: 22px;font-weight: 700;">Powered by PumpGuard</p>
                
            </div></div>
            `



            var dots = $('.dots')
            var shine = $('.shine')

            dots.removeClass('d-none')
            shine.removeClass('d-none').addClass(shine.data('in'))

        } else {
            $('.check-wr')[0].innerHTML = `
            <img src="./src/radial.png" style="position: absolute; width: 500px; height: 500px;left: calc(50% - 250px);top: 80px;opacity: 0.25;z-index: 0;">

            <div><div style="display: flex;text-align: center;place-content: space-around;margin-top: 30px;"><div style=" "><img src="https://pumpguard.fun/imgs/ico_${data.coinData.mint}.jpg" style="width: 90px;height: 90px;margin: 6px 0px 0px 6px;border-radius: 7px;"><div style="margin: 0px 10px;text-align: left;width: auto;">
            <p style="color: #f0f8ffe8;margin: 0px 0px 0px 0px;font-size: 18px;font-weight: 700;">
            ${data.coinData.name} [${data.coinData.symbol}]</p>
                    
            <p style="color: #f0f8ffa3;margin: 0px 0px 0px 0px;font-size: 16px;font-weight: 500;text-align: center;">${data.coinData.mint.slice(0, 6) + "...." + data.coinData.mint.slice(data.coinData.mint.length - 6,
                10000)}</p></div></div>
                
            </div>
            
            <div style="display: flex;text-align: center;place-content: space-around"><p style="color: #b34f63;margin: 19px 0px 0px 0px;font-size: 22px;font-weight: 700;">Is NOT Guarded by any Solana!</p>
            
            </div><div style="display: flex;text-align: center;place-content: space-around;"><p style="color: #ffffffbf;margin: 0px 0px 0px 0px;font-size: 17px;font-weight: 500;">Invest mindfully!</p>
                
            </div></div>
            `
        }

    }

}


async function checkCA() {
    const _ca = $('.ca-check-inp')[1].value
    selectedCoinCa = _ca

    const response = await fetch('https://pumpguard.fun/get_coin_lock_address', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ca: _ca
        }),
    });

    if (response.ok) {
        const data = await response.json()
        if (data.dev && data.dev.length > 35) {
            $('.dp-lock-wr')[0].style.display = "block"


            $('.dt-lock-name-1')[0].innerHTML = $('.dt-lock-name-2')[0].innerHTML = data.symbol

            $('.dt-lock-1')[0].innerHTML = data.lockAddress
            $('.dt-lock-2')[0].innerHTML = (data.balance / 1e9).toFixed(3) + " Solana"
            $('.dt-lock-3')[0].innerHTML = data.dev.slice(0, 6) + "...." + data.dev.slice(data.dev.length - 6,
                10000)

            $('.copy-d-addr').first().on('click', function () {
                copyToClipboard(data.lockAddress);
            });
        }
    }

}




async function checkForRefunds() {
    $('.refunds-u-main-wr')[0].innerHTML = ""

    const response = await fetch('https://pumpguard.fun/get_user_refunds', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            address: $('.refund-check-inp')[0].value
        }),
    });

    if (response.ok) {
        let data
        try {
            data = await response.json()
        } catch {
            data = {
                refunds: []
            }
        }

        console.log(data, "a2")

        $('.refunds-u-wr')[0].style.display = "block"

        if (data.refunds.length == 0) {
            $('.no-refunds-tx')[0].style.display = "block"
        } else {
            $('.no-refunds-tx')[0].style.display = "none"

            data.refunds.forEach(itm => {
                $('.refunds-u-main-wr')[0].innerHTML +=
                    `<div style=" border: 3px solid #ffffff05; padding: 5px 15px 10px 15px; border-radius: 6px; background: #4848480d; margin: 0px 70px; margin-bottom: 10px; /* display: none; */ ">
                    <div style="   text-align: center;   display: flex; ">
                        <div class="w2" style="display: flex;width: 100%;justify-content: space-between;">
                            <div style=" display: flex; "><img
                                    src="https://pumpguard.fun/imgs/ico_${itm.ca}.jpg"
                                    style="width: 50px;height: 50px;margin: 6px 0px 0px 6px;border-radius: 7px;">
                                <div style="margin: 0px 10px;text-align: left;position: relative;">
                                    <div style="     display: flex;     position: absolute; ">
                                        <p style="color: #f0f8ffb5;margin: 6px 0px 0px 0px;font-size: 17px;font-weight: 700;"> ${itm.name}
                                            [${itm.symbol}]</p> <svg class="HW-name-copy"
                                            onclick="copyToClipboard('${itm.ca}')"
                                            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"
                                            style="width: 13px;fill: #cfcfcf7a;margin-left: 9px;margin-top: 2px;cursor: pointer;display: inline-block;">
                                            <path
                                                d="M208 0H332.1c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9V336c0 26.5-21.5 48-48 48H208c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zM48 128h80v64H64V448H256V416h64v48c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V176c0-26.5 21.5-48 48-48z">
                                            </path>
                                        </svg>
                                    </div>
                                    <p style="color: #c9717c;margin: 36px 0px 0px 0px;font-size: 14px;">Detected As Rug In: <span
                                            style=" font-weight: 700; ">${timeConverter(itm.rugDetectDate)}</span></p>
                                </div>
                            </div>
                            <div style="/* margin: 0px 10px; */text-align: left;/* width: 100%; */">
                                <p style="color: #f0f8ffb5;margin: 6px 0px 0px 0px;font-size: 14px;">Your PnL: <span
                                        style="font-weight: 700;color: #c9717c;">-${itm.originalLoss} SOL</span></p>
                                <p style="color: #f0f8ffb5;margin: 8px 0px 0px 0px;font-size: 14px;">Your Refund: <span
                                        style="font-weight: 700;color: #5e946e;">${itm.refundAmount} SOL</span></p>
                            </div>
                            <div style="margin: 0px 9px;margin-top: 16px;right: 0px;"> <button onclick="claimRefund('${$('.refund-check-inp')[0].value}', '${itm.ca}')"
                                    class=" floating-btn custom-button btn-m"
                                    style="background: linear-gradient(135deg, rgba(255, 105, 105, 0) 5%, rgb(114 174 106) 5%, rgb(45 106 82) 95%, rgba(255, 61, 103, 0) 95%);width: auto;padding: 0px 15px;">Claim
                                    ${itm.refundAmount} SOL Refund For ${itm.symbol}</button> </div>
                        </div>
                    </div>
                </div>
                `
            })
        }

    }

}


async function claimRefund(userAddress, _CA) {
    if (!_solanaWeb3) {
        console.error('Solana wallet not connected');
        await connectWallet()
    }

    if (!_solanaWeb3) {
        console.error('Solana wallet not connected 2nd try!');
        return;
    }

    const message = getRandomBytesHex(64)

    // Sign the message using the user's wallet
    let signature
    try {
        signature = await _solanaWeb3.signMessage(new TextEncoder().encode(message), 'utf8');
    } catch (err) {
        console.log("Error on signature: ", err)
    }


    const response = await fetch('https://pumpguard.fun/pay_user_refund', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ca: _CA,
            publicKey: userAddress,
            signature: signature.signature.toString('base64'),
            message: message,
        }),
    });

    if (response.ok) {
        let data
        try {
            data = await response.json()
        } catch {
            data = {
                refunds: []
            }
        }

        // console.log(data, "a2")
    }
}


async function fetchRecentlyRefunded() {
    $('.refund-list-wr')[0].innerHTML =
        `<p style=" color: #f0f8ff26; text-align: center; font-size: 30px; margin: 0px;">Fetching Data...</p>`

    const response = await fetch('https://pumpguard.fun/get_rugged_coins', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    if (response.ok) {
        const data = await response.json()
        $('.refund-list-wr')[0].innerHTML = ""
        console.log("ddd", data)

        for (var i = 0; i < data.length; i++) {
            const randomeClassName = generateRandomInt()

            $('.refund-list-wr')[0].innerHTML +=
                `
            <div style="box-shadow: 0px 0px 13px #0000001f; margin: 0px 10px; margin-top: 15px; ">
                <div style="border: 3px solid #ffffff05;border-radius: 6px;background: #4848480d;margin-bottom: 0;text-align: center;color: #edeef6b5;font-size: 18px;/* display: none; */padding: 5px 10px 5px 10px;border-bottom-left-radius: 0px;border-bottom-right-radius: 0px;">
                    <div style="   text-align: center;   display: flex; ">
                        <div class="w2" style="display: flex;width: 100%;justify-content: space-between;">
                            <div style=" display: flex; "><img
                                    src="https://pumpguard.fun/imgs/ico_${data[i].ca}.jpg"
                                    style="width: 44px;height: 44px;margin: 2px 0px 0px 6px;border-radius: 7px;">
                                <div style="margin: 0px 10px;text-align: left;position: relative;">
                                    <div style="display: flex;position: absolute;width: max-content;">
                                        <p style="color: #f0f8ffb5;margin: 1px 0px 0px 0px;font-size: 17px;font-weight: 700;"> ${data[i].name}
                                            [${data[i].symbol}]</p> <svg class="HW-name-copy"
                                            onclick="copyToClipboard('${data[i].ca}')"
                                            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"
                                            style="width: 13px;fill: #cfcfcf7a;margin-left: 9px;margin-top: 2px;cursor: pointer;display: inline-block;">
                                            <path
                                                d="M208 0H332.1c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9V336c0 26.5-21.5 48-48 48H208c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zM48 128h80v64H64V448H256V416h64v48c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V176c0-26.5 21.5-48 48-48z">
                                            </path>
                                        </svg>
                                    </div>
                                    <p style="margin: 26px 0px 0px 0px;font-size: 14px;">Was guarded with <span style="color: #5e9e71;font-weight: 900;">${(data[i].balance / 1e9).toFixed(3)} Sol</span></p>
                                </div>
                            </div>
                            <div style="text-align: left;margin-top: 10px;">
                                <p style="color: #c9747f;margin: 2px 0px 0px 0px;font-size: 16px;font-weight: 800;">Was recognized
                                    as a rug on ${timeConverter(data[i].rugDetectDate)}</p>
                            </div>
                            <div style="/* margin: 0px 10px; */text-align: left;/* width: 100%; */width: 20vw;">
                                <p style="color: #f0f8ffb5;margin: 1px 0px 0px 0px;font-size: 16px;text-align: center;"> <span
                                        style="     font-weight: 800; ">25 Investors</span> are eligible to share a total refund of
                                    <span style="     font-weight: 800; ">${(data[i].balance / 1e9).toFixed(3)} Solana</span> </p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="${randomeClassName}" style="text-align: center;display: flex;padding-top: 5px;border-radius: 6px;background: #ffffff0a;border-top: none;margin: 0px 0px;border-top-left-radius: 0;border-top-right-radius: 0;cursor: pointer; display: ruby-text;" onclick="showEligibleRefunds('${data[i].ca}', ${randomeClassName})">
                    <p style="     font-size: 14px; text-align: center; width: 100%;color: #f0f8ff61;margin: 0px 10px;margin-top: -6px;     padding-bottom: 3px; "> View eligible users and refunds</p>
                </div>
            </div>
            `
        }
    }

}


async function showEligibleRefunds(_CA, randomeClassName) {
    $(`.${randomeClassName}`)[0].innerHTML =
        ` <p style="     font-size: 14px; text-align: center; width: 100%;color: #f0f8ff61;margin: 0px 10px;margin-top: -6px;     padding-bottom: 3px; "> Fetching Data... </p>`

    const response = await fetch('https://pumpguard.fun/get_coin_refund_eligible_users', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ca: _CA
        }),
    })

    if (response.ok) {
        const data = await response.json()

        $(`.${randomeClassName}`)[0].innerHTML = ""
        data.forEach(itm => {
            $(`.${randomeClassName}`)[0].innerHTML += `
                <div style=" display: flex; background: #ffffff0d; border-radius: 5px; padding: 2px 10px; margin: 5px 10px;"><p style=" margin: 10px 15px 10px 4px; color: #f0f8ff73; font-weight: 800; font-size: 15px; border-right: 2px solid #ffffff6e; padding-right: 10px; width: 150px;">${itm.userAddress.slice(0, 6) + "...." + itm.userAddress.slice(itm.userAddress.length - 6, 10000)}</p><div style=" width: 130px;text-align: left;"><p style=" margin: 0px; font-size: 12px; color: #f0f8ffb5; padding-top: 4px;">PnL: <span style=" font-weight: 900;">-${(itm.originalLoss).toFixed(3)} SOL</span></p><p style=" margin: 0px; font-size: 12px; color: #f0f8ffb5;">Refund: <span style=" font-weight: 900;">${(itm.refundAmount).toFixed(3)} SOL</span></p></div></div>
            `
        })
    }
}


async function validateDevRefund() {
    $('.dev-refund-wr')[0].style.display = "block"
    $(`.dev-refund-wr`)[0].innerHTML =
        ` <p style="     font-size: 14px; text-align: center; width: 100%;color: #f0f8ff61;margin: 0px 10px;margin-top: -6px;     padding-bottom: 3px; "> Fetching Data... </p>`

    const response = await fetch('https://pumpguard.fun/get_coin_status', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ca: $('.dev-refund-inp')[0].value
        }),
    })

    if (response.ok) {
        const data = await response.json()
        console.log(data, "data7")

        let txt
        if (data.verifyRug == "RUGGED" || data.hasRuged == true) {
            if (data.rugDetectDate) {
                txt = data.symbol +
                    ` was detected as a rug in ${timeConverter(data.rugDetectDate)}. The locked solana cannot be claimed.`
            } else {
                txt = data.symbol + " is detected as a rug. The locked solana cannot be claimed."
            }
        }

        if (data.hasMigrated) {
            txt = data.symbol + " has migrated and the locked solana can be claimed by dev."
        }

        if (!data.devRefundTX) {
            data.devRefundTX = "--"
        }

        $('.dev-refund-wr')[0].innerHTML = `
        <div style=" border: 3px solid #ffffff05; padding: 5px 15px 10px 15px; border-radius: 6px; background: #4848480d; margin: 0px 70px; margin-bottom: 10px; /* display: none; */ ">
            <div style="   text-align: center;   display: flex; ">
                <div class="w2" style="display: flex;width: 100%;justify-content: space-between;">
                    <div style=" display: flex; "><img src="https://pumpguard.fun/imgs/ico_${data.ca}.jpg" style="width: 50px;height: 50px;margin: 6px 0px 0px 6px;border-radius: 7px;">
                        <div style=margin: 0px 10px;text-align: left;position: relative;width: 150px;">
                            <div style="     display: flex;     position: absolute; ">
                                <p style="color: #f0f8ffb5;margin: 6px 0px 0px 0px;font-size: 17px;font-weight: 700;">${data.symbol}</p> <svg class="HW-name-copy" onclick="copyToClipboard('HHtQvS8QrVavE4hsmbzrLFgaucY1NhdYmBtJK824pump')" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" style="width: 13px;fill: #cfcfcf7a;margin-left: 9px;margin-top: 2px;cursor: pointer;display: inline-block;">
                                    <path d="M208 0H332.1c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9V336c0 26.5-21.5 48-48 48H208c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zM48 128h80v64H64V448H256V416h64v48c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V176c0-26.5 21.5-48 48-48z">
                                    </path>
                                </svg>
                            </div>
                            <p style="color: #ffffffbd;margin: 36px 0px 0px 0px;font-size: 14px;">Locked Solana: <span style=" font-weight: 700; ">${(data.balance / 1e9).toFixed(3)}</span></p>
                        </div>
                    </div>
                    <div style="text-align: unset;">
                        <p style="color: #f0f8ffb5;margin: 6px 0px 0px 0px;font-size: 16px;"><span style="font-weight: 700;/* color: #c9717c; */">${txt}</span></p>
                        <p style="color: #f0f8ffb5;margin: 8px 0px 0px 0px;font-size: 13px;">Dev Refund TX: <span style="/* font-weight: 700; */">${data.devRefundTX}</span></p>
                    </div>
                    <div style="margin: 0px 9px;margin-top: 16px;right: 0px;"> <button onclick="devClaimLockedSol()" class=" floating-btn custom-button btn-m" style="background: linear-gradient(135deg, rgba(255, 105, 105, 0) 5%, rgb(114 174 106) 5%, rgb(45 106 82) 95%, rgba(255, 61, 103, 0) 95%);width: auto;padding: 0px 15px;">Claim Locked Solana</button> </div>
                </div>
            </div>
        </div>
        `
    }
}


async function devClaimLockedSol() {
    if (!_solanaWeb3) {
        console.error('Solana wallet not connected');
        await connectWallet()
    }

    if (!_solanaWeb3) {
        console.error('Solana wallet not connected 2nd try!');
        return;
    }

    const message = getRandomBytesHex(64)

    // Sign the message using the user's wallet
    let signature
    try {
        signature = await _solanaWeb3.signMessage(new TextEncoder().encode(message), 'utf8');
    } catch (err) {
        console.log("Error on signature: ", err)
    }

    const response = await fetch('https://pumpguard.fun/claim_dev_refund', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            ca: $('.dev-refund-inp')[0].value,
            publicKey: userAddress,
            signature: signature.signature.toString('base64'),
            message: message,
        }),
    });

    if (response.ok) {
        let data
        try {
            data = await response.json()
        } catch {

        }

        // console.log(data, "a2")
    }
}



function timeConverter(UNIX_timestamp) {
    var a = new Date(UNIX_timestamp);
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    // var time = date + ' ' + month + ' ' + year ;
    //var time = month + " '" + date;

    var time = month + " " + date;
    return time;
}

function lgNUM(num, decimals) {
    num = parseFloat(num);

    let newNum;

    if (num >= 0) {
        newNum = num / 1;

        // Check if the number is an integer
        if (!Number.isInteger(newNum)) {
            newNum = newNum.toFixed(decimals);
        }
    }

    if (num >= 1000) {
        newNum = num / 1000;
        newNum = newNum.toFixed(decimals);
        newNum = newNum + "K";
    }

    if (num >= 1000000) {
        newNum = num / 1000000;
        newNum = newNum.toFixed(decimals);
        newNum = newNum + "M";
    }

    if (num >= 1000000000) {
        newNum = num / 1000000000;
        newNum = newNum.toFixed(decimals);
        newNum = newNum + "B";
    }

    if (num == 0 || num < 0) return 0;

    return newNum;
}



function timeDifference(current, previous) {

    var msPerMinute = 60 * 1000;
    var msPerHour = msPerMinute * 60;
    var msPerDay = msPerHour * 24;
    var msPerMonth = msPerDay * 30;
    var msPerYear = msPerDay * 365;

    var elapsed = current - previous;

    if (elapsed < msPerMinute) {
        return Math.round(elapsed / 1000) + ' sec';
    } else if (elapsed < msPerHour) {
        return Math.round(elapsed / msPerMinute) + ' min';
    } else if (elapsed < msPerDay) {
        return Math.round(elapsed / msPerHour) + ' hours';
    } else if (elapsed < msPerMonth) {
        return Math.round(elapsed / msPerDay) + ' days';
    } else if (elapsed < msPerYear) {
        return Math.round(elapsed / msPerMonth) + ' months';
    } else {
        return Math.round(elapsed / msPerYear) + ' years';
    }
}

function generateRandomInt() {
    return Math.floor(Math.random() * 900000000) + 100000000;
}

function copyToClipboard(textToCopy) {
    navigator.clipboard.writeText(textToCopy)
        .then(() => {
            window.doNotification({
                text: "Address Copied.",
                variant: 'info',
                duration: 1000,
                position: 'right-bottom',
                backgroundColor: '#455a64',
            })
        })
}

function extractAddress(url) {
    const urlParts = url.split('/');
    const addressIndex = urlParts.indexOf('ipfs');

    if (addressIndex === -1) {
        return null; // Return null if the URL doesn't contain 'ipfs'
    }

    const address = urlParts[addressIndex + 1];
    return address;
}

function getRandomBytesHex(length) {
    // Create a new Uint8Array of 'length' bytes
    const randomBytes = new Uint8Array(length);
    // Fill the array with cryptographically secure random bytes
    window.crypto.getRandomValues(randomBytes);
    // Convert the Uint8Array to a hexadecimal string
    const hexString = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    return hexString;
}
