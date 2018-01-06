pragma solidity ^0.4.18;

contract Token {

    uint256 tokenSupply;
    uint256 tokenDecimals;
    string tokenSymbol;
    string tokenName;
    
	mapping (address => uint256) balance;
	mapping (address =>
		mapping (address => uint256)) m_allowance;

    modifier onlyGoodData() {
        require(msg.data.length % 32 == 4);
        _;
    }

	event Transfer(address indexed _from, address indexed _to, uint256 _value);

    event Approval(address indexed _owner, address indexed _spender, uint256 _value);

    function Token(string _name, string _symbol, uint256 _decimals, uint256 _supply) public {
        tokenSupply   = _supply;
        tokenDecimals = _decimals;
        tokenSymbol   = _symbol;
        tokenName     = _name;
		balance[msg.sender] = tokenSupply;
	}

	function balanceOf(address _account) view public returns (uint) {
		return balance[_account];
	}

	function name() view public returns (string) {
		return tokenName;
	}

	function symbol() view public returns (string) {
		return tokenSymbol;
	}

	function decimals() view public returns (uint) {
		return tokenDecimals;
	}

	function totalSupply() view public returns (uint) {
		return tokenSupply;
	}

	function transfer(address _to, uint256 _value) onlyGoodData() public returns (bool success)    
    {
		return doTransfer(msg.sender, _to, _value);
	}

	function transferFrom(address _from, address _to, uint256 _value) onlyGoodData() public returns (bool)
    {
		if (m_allowance[_from][msg.sender] >= _value) {
			if (doTransfer(_from, _to, _value)) {
				m_allowance[_from][msg.sender] -= _value;
			}
			return true;
		} else {
			revert();
		}
	}

	function doTransfer(address _from, address _to, uint _value) internal returns (bool success)
    {
		if (balance[_from] >= _value && balance[_to] + _value >= balance[_to]) {
            if (_value > 0) {
               balance[_from] -= _value;
			   balance[_to] += _value;
			   Transfer(_from, _to, _value);
            }
			return true;
		} else {
			revert();
		}
	}

	function approve(address _spender, uint256 _value) onlyGoodData() public returns (bool success)
    {
        if (_value > tokenSupply) {
           revert();
        }
        // Avoid "front-running" attack
        if (_value > 0 && m_allowance[msg.sender][_spender] > 0) {
           revert();
        }
        m_allowance[msg.sender][_spender] = _value;
		Approval(msg.sender, _spender, _value);
		return true;
	}

	function allowance(address _owner, address _spender) view public returns (uint256) {
		return m_allowance[_owner][_spender];
	}
}
