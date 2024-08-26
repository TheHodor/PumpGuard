const WHITE = "#f0f8ffb5"
const RED = "#c53e66"
const GREEN = "#5a9f5d"

jQuery(document).ready(function ($) {
    getCurrentlyProcessingCAs()
})

async function getCurrentlyProcessingCAs() {
    const response = await fetch('https://pumpguard.fun/_processing_txes_active', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    });

    console.log('Raw response:', response);

    if (!response.ok) {
        console.error('Error fetching data:', response.status);
        return;
    }

    const data = await response.json();
    console.log('Parsed data:', data);

    if (data[0].length > 0) {
        $('.parsing-ls')[0].innerHTML = ""
    }

    data[0].forEach(itm => {
        $('.parsing-ls')[0].innerHTML += " [[[ " + itm + " -- TXs so far: " + data[1][itm] + " ]]] "
    })
}


async function parseCA() {
    const response = await fetch('https://pumpguard.fun/_parse_ca', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-key': getPassowrd()
        },
        body: JSON.stringify({
            ca: $('.inp-admin-1')[0].value,
            fetchDelay: $('.inp-admin-2')[0].value || 3
        }),
    })

    const data = await response.json();
    console.log(data)

    doNotif(data)
}


async function verifyRug_calcRefund() {
    const response = await fetch('https://pumpguard.fun/_verify_rug', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-key': getPassowrd()
        },
        body: JSON.stringify({
            ca: $('.inp-admin-5')[0].value
        }),
    })

    const data = await response.json();
    console.log(data)

    doNotif(data)
}

async function getCoinHolders() {
    const response = await fetch('https://pumpguard.fun/_get_coin_holders', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-admin-key': getPassowrd()
        },
        body: JSON.stringify({
            ca: $('.inp-admin-4')[0].value
        }),
    })
    const data = await response.json();
    console.log(data)

    $('.coin-ca-db')[0].innerHTML = $('.inp-admin-4')[0].value
    $('.coins-holders-db')[0].innerHTML = ""

    let _innerHTML = ""
    data.forEach(itm => {

        _color_refundamount = RED
        if (itm.refundAmount) {
            _color_refundamount = GREEN
        }

        _color_insider = WHITE
        if (itm.isInsider) {
            _color_insider = RED
        } else if (itm.isInsider == false) {
            _color_insider = GREEN
        }

        _innerHTML += `
        <div style="/* display:inline-block; */margin: 5px;box-shadow: rgb(0 0 0 / 15%) 2px 2px 9px;width: auto;margin-bottom: 10px;background: #0f111380;">
            <div class="UI-ww6 card flex space-x-3"
                style="/* height: 120px; */padding: 0;border: 2px solid rgb(121 131 153 / 15%);border-radius: 7px;color: rgb(0 0 0 / 83%);flex-direction: column;min-width: 1px;overflow-wrap: break-word;position: relative;display: flex;backdrop-filter: blur(2px);">
                <div class="flex-1 space-y-2" style=" flex: 1 1 0%; display: block; ">
                    <div class="w2" style="display: flex;width: 100%;justify-content: space-between;">
                        <div style=" display: flex;     width: 100%;">
                            <div style=" margin: 0px 10px; text-align: left; width: 100%;">
                                <div style="display: flex;">
                                    <p style="color: #f0f8ffb5;margin: 6px 0px 0px 0px;font-size: 13px;font-weight: 700;">
                                        ${itm.address}</p> <svg class="HW-name-copy"
                                        onclick="copyToClipboard('${itm.address}')"
                                        xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"
                                        style="width: 13px;fill: #cfcfcf7a;margin-left: 9px;margin-top: 2px;cursor: pointer;display: inline-block;">
                                        <path
                                            d="M208 0H332.1c12.7 0 24.9 5.1 33.9 14.1l67.9 67.9c9 9 14.1 21.2 14.1 33.9V336c0 26.5-21.5 48-48 48H208c-26.5 0-48-21.5-48-48V48c0-26.5 21.5-48 48-48zM48 128h80v64H64V448H256V416h64v48c0 26.5-21.5 48-48 48H48c-26.5 0-48-21.5-48-48V176c0-26.5 21.5-48 48-48z">
                                        </path>
                                    </svg>
                                </div>
                                <div style="     display: flex;     justify-content: space-between; ">
                                    <p style="color: #f0f8ffb5;margin: 06px 0px 0px 0px;font-size: 13px;">PnL: <span
                                            style=" font-weight: 700; ">${(itm.PnL).toFixed(4)} SOL</span></p>
                                    <p style="color: #f0f8ffb5;margin: 06px 0px 0px 0px;font-size: 13px;">Bought: <span
                                            style=" font-weight: 700; ">${(itm.totalSolBought).toFixed(4)} SOL</span></p>
                                    <p style="color: #f0f8ffb5;margin: 06px 0px 0px 0px;font-size: 13px;">Sold: <span
                                            style=" font-weight: 700; ">${(itm.totalSolSold).toFixed(4)} SOL</span></p>
                                </div>
                                <div
                                    style="     display: flex;     justify-content: space-between;     margin-bottom: 5px;     margin-top: 4px; ">
                                    <p style="color: #f0f8ffb5;margin: 06px 0px 0px 0px;font-size: 13px;">Tag: <span
                                            style=" font-weight: 700; ">${itm.tag}</span></p>
                                    <p style="color: #f0f8ffb5;margin: 06px 0px 0px 0px;font-size: 13px;">Insider: <span
                                            style=" font-weight: 700; color:${_color_insider}">${itm.isInsider}</span></p>
                                    <p style="color: #f0f8ffb5;margin: 06px 0px 0px 0px;font-size: 13px;">Holding: <span style=" font-weight: 700; ">${(itm.worthOfTokensSol).toFixed(4)} SOL</span></p> 
                                </div>


                                <div style=" display: flex; justify-content: space-between; margin-bottom: 5px; margin-top: 4px; ">
                                    <p style="color: #f0f8ffb5;margin: 06px 0px 0px 0px;font-size: 13px;">Eligible Refund Share: <span style=" font-weight: 700; color:${_color_refundamount}">${(itm.refundAmount || 0).toFixed(4)} SOL</span></p>

                                    <p style="color: #f0f8ffb5;margin: 06px 0px 0px 0px;font-size: 13px;">Refund Paid: <span style=" font-weight: 700; ">-- </span></p>
                                </div>
                          

                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`
    })

    $('.coins-holders-db')[0].innerHTML = _innerHTML

}









function doNotif(data) {
    $('.msg-tst')[0].style.display = "block"
    $('.msg-tst')[0].innerHTML = JSON.stringify(data)
    setTimeout(() => {
        $('.msg-tst')[0].style.display = "none"
    }, 8000)
}

function getPassowrd() {
    const password = prompt("Please enter PW:");

    if (password === null || password === "") {
        // User clicked Cancel or didn't enter anything
        alert("Password is required to access the admin end points.");
    } else {
        // User entered a password
        // You can validate the password here and proceed with the admin panel functionality
        console.log(password)
        return password
    }
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
